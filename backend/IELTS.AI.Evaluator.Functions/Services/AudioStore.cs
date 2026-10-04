using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

/// <summary>Recordings of candidate answers, kept for playback on the feedback page.</summary>
public interface IAudioStore
{
    /// <summary>False when AudioStorageConnectionString is not set: nothing is stored and the feedback
    /// page shows no player, but recordings are still scored.</summary>
    bool IsConfigured { get; }

    /// <summary>Uploads one recording. Returns false (and logs) instead of throwing: a failed upload
    /// must never cost the candidate feedback that is already paid for.</summary>
    Task<bool> TryUploadAsync(string blobName, string contentType, byte[] data);

    /// <summary>A read-only link that expires after validFor, or null when one cannot be signed.</summary>
    string? ReadUrl(string blobName, TimeSpan validFor);
}

public class BlobAudioStore : IAudioStore
{
    private const string ContainerName = "speaking-audio";
    private readonly BlobContainerClient? _container;
    private readonly ILogger<BlobAudioStore> _logger;
    private bool _containerReady;

    public BlobAudioStore(IConfiguration config, ILogger<BlobAudioStore> logger)
    {
        _logger = logger;
        var connectionString = config["AudioStorageConnectionString"];
        if (!string.IsNullOrWhiteSpace(connectionString))
            _container = new BlobContainerClient(connectionString, ContainerName);
    }

    public bool IsConfigured => _container is not null;

    public async Task<bool> TryUploadAsync(string blobName, string contentType, byte[] data)
    {
        if (_container is null)
            return false;
        try
        {
            if (!_containerReady)
            {
                // Private by default: no public access level, so a blob is only reachable through a
                // signed link.
                await _container.CreateIfNotExistsAsync();
                _containerReady = true;
            }
            await _container.GetBlobClient(blobName).UploadAsync(new BinaryData(data),
                new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } });
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Uploading recording {Blob} failed", blobName);
            return false;
        }
    }

    public string? ReadUrl(string blobName, TimeSpan validFor)
    {
        if (_container is null)
            return null;
        var blob = _container.GetBlobClient(blobName);
        // Signing needs the account key that a key-based connection string (or Azurite's) carries.
        return blob.CanGenerateSasUri
            ? blob.GenerateSasUri(BlobSasPermissions.Read, DateTimeOffset.UtcNow.Add(validFor)).ToString()
            : null;
    }
}
