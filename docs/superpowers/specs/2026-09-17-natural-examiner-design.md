# Examiner Speaking yang Lebih Natural

## Context
Hasil eksplorasi menunjukkan latihan Speaking terasa kaku karena empat hal:
- **Suara datar.** TTS memakai `speakTextAsync` dengan teks polos (tanpa SSML) dan voice neural standar.
- **Latency tinggi.** Gemini 2.5 Flash dipanggil tanpa `thinkingConfig`, jadi thinking menyala default, dan token thinking tidak tercatat di usage.
- **Tidak ada turn-taking natural.** User harus menekan mulai/stop di setiap giliran.
- **Error permanen.** Satu gangguan kecil (`speech.error`) memindahkan sesi ke mode ketik selamanya, dan tombol "Use mic" disembunyikan.
- **Cue card Part 2 tidak dibacakan.**

Keputusan user: tetap memakai Azure (upgrade, tanpa vendor baru), dan giliran berakhir otomatis setelah hening sekitar 3 detik, dengan tombol stop tetap tersedia.

## Desain

### 1. Suara: SSML + voice yang bisa dikonfigurasi
File: `frontend/ielts-ai-evaluator-frontend/src/hooks/use-speech.ts`
- Di `speak()`, ganti `speakTextAsync(text)` dengan `speakSsmlAsync(ssml)`.
- SSML dibuat oleh helper kecil `toSsml(text, voice)`:
  - `<speak><voice name={voice}><prosody rate="-8%">{escaped text}</prosody></voice></speak>`
  - Escape `& < > " '`.
  - Tambahkan `<break time="300ms"/>` setelah tanda tanya atau titik di tengah kalimat. Ini cukup lewat regex sederhana di teks yang sudah di-escape.
- Voice tetap diambil dari config `ExaminerVoice` (`SpeechTokenService.cs:32`), jadi upgrade ke HD voice hanya perlu perubahan app setting, tanpa kode. Saat implementasi, cek Azure Voice Gallery apakah ada HD/Dragon voice en-GB yang tersedia di region kita dan mendukung `prosody`. Kalau tidak ada, default tetap `en-GB-RyanNeural`.
- Token speech di-prefetch saat halaman dimuat (`getSpeechToken()` di effect mount), supaya greeting pertama tidak menunggu token.
- Kalau `speak`/`startListening` gagal, kosongkan `cachedToken` supaya token yang ditolak tidak dipakai ulang.

### 2. Latency Gemini untuk examiner turn
File: `backend/IELTS.AI.Evaluator.Functions/Services/GeminiStructuredClient.cs`
- Tambahkan parameter opsional `int? thinkingBudget = null` di `GenerateAsync` (interface dan class). Kalau nilainya tidak null, kirim `generationConfig.thinkingConfig.thinkingBudget`. Karena anonymous object tidak bisa berisi field opsional, `generationConfig` diganti menjadi `Dictionary<string, object>`.
- `ExaminerService.cs:54` mengirim `thinkingBudget: 0`, karena pertanyaan lanjutan examiner tidak butuh reasoning. Evaluasi Writing/Speaking tidak diubah (tetap null), supaya kualitas penilaian tetap sama.
- Perbaikan pencatatan biaya: `CompletionTokens = candidatesTokenCount + thoughtsTokenCount` (`GeminiStructuredClient.cs:109`).
- Tambahkan parameter yang sama ke fake client di `WritingServiceTests.cs:23`.

### 3. Turn-taking otomatis
**Hook** (`use-speech.ts`): `startListening(opts?: { onSilence?: () => void; silenceMs?: number })`
- Timer silence baru dipasang setelah event `recognizing`/`recognized` pertama. Jeda berpikir sebelum kata pertama tidak mengakhiri giliran.
- Timer di-reset di setiap event. Kalau habis, `onSilence()` dipanggil sekali.
- Timer dibersihkan di `stopListening` dan saat unmount.

**Page** (`src/pages/SpeakingPractice.tsx`)
- Konstanta `SILENCE_MS = 3000`.
- Effect baru: kalau `callState === "yourTurn"`, mic dinyalakan otomatis (`startListening({ onSilence })`, lalu `setCallState("listening")`). Tidak berlaku kalau `typedMode`, `partComplete`, `pendingRetryTurns`, `isSubmittingFinal`, atau Part 2 sebelum jawaban pertama (fase prep yang sudah ada tetap mengurus ini).
- `onSilence` menjalankan jalur yang sama dengan tombol stop: `stopListening`, lalu `submitCandidateTurn`. Handler disimpan lewat ref supaya tidak kena stale closure.
- Long turn Part 2 (`part2Phase === "talk"`) tidak memakai `onSilence`, karena timer 120 detik yang mengatur. Pertanyaan penutup Part 2 memakai silence seperti biasa.
- Tombol mic tetap berfungsi sebagai stop manual. Label badge "Listening" tetap sama.

### 4. Cue card dibacakan
Saat greeting Part 2 (`SpeakingPractice.tsx:90-105`), yang dibacakan adalah `questionText + " You should say: " + cuePoints.join(", ")`. Transkrip di chat tetap hanya `questionText`, karena cue card sudah tampil sebagai kartu.

### 5. Pemulihan error mic
File: `SpeakingPractice.tsx`
- Error speech tetap memindahkan sesi ke mode ketik dan menampilkan toast, tapi tombol "Use mic" sekarang selalu tampil di mode ketik (guard `!forcedTypedMode` di baris 404 dihapus).
- Klik "Use mic" me-reset `forcedTypedMode`, `manualTypedMode`, dan `degradedToastRef`, jadi user bisa mencoba voice lagi. Kalau `!speech.supported`, tombol tetap disembunyikan.

## Yang sengaja dilewati
- **Reuse synthesizer / pre-warm koneksi TTS.** `SpeakerAudioDestination` hanya bisa dipakai sekali per ucapan, dan latency utama ada di Gemini. Tambahkan kalau pengukuran menunjukkan setup TTS masih lambat.
- **Streaming Gemini, barge-in (memotong examiner), dan fallback TTS untuk iOS.** Masing-masing sub-proyek sendiri.
- **Mengubah bahasa recognition ke en-GB.** Ini mengubah hasil pronunciation scoring, jadi di luar scope.

## Urutan kerja
1. Tulis spec ke `docs/superpowers/specs/2026-09-17-natural-examiner-design.md`, lalu commit.
2. Backend: `thinkingBudget` + perhitungan token, beserta test.
3. Frontend hook: SSML, prefetch/clear token, silence timer.
4. Frontend page: auto-listen, `onSilence`, cue card dibacakan, "Use mic" recovery.

## Verification
- **Backend:** `dotnet test` di `backend/`. Tambahkan 2 test di `GeminiStructuredClientTests.cs`:
  - `thinkingBudget: 0` menghasilkan body yang berisi `"thinkingConfig":{"thinkingBudget":0}`, dan tanpa parameter tidak ada `thinkingConfig`.
  - `CompletionTokens` menjumlahkan `thoughtsTokenCount`.
- **Frontend:** `npm run lint` dan `npm run build` di `frontend/ielts-ai-evaluator-frontend`.
- **Manual (func start + npm run dev):**
  1. Part 1: examiner bicara, mic menyala sendiri, jawab lalu diam 3 detik, giliran terkirim otomatis. Jeda 2 detik di tengah kalimat tidak memotong jawaban.
  2. Tombol stop manual masih berfungsi.
  3. Part 2: cue points dibacakan, prep 60 detik, talk 120 detik tidak terpotong oleh diam, lalu pertanyaan penutup memakai auto-silence.
  4. Matikan jaringan saat listening: sesi pindah ke mode ketik, klik "Use mic", dan voice pulih.
  5. Bandingkan waktu request `examiner-turn` di DevTools Network sebelum dan sesudah perubahan (target: turun signifikan).
  6. Suara: bandingkan kesan sebelum dan sesudah SSML, dan coba HD voice lewat `ExaminerVoice` kalau tersedia.
