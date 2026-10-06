using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

/// <summary>Recordings of candidate answers, kept for playback on the feedback page.</summary>
public interface IAudioStore
{
    /// <summary>False when AudioStorageAccount / AudioStorageContainer are not set: nothing is stored
    /// and the feedback page shows no player, but recordings are still scored.</summary>
    bool IsConfigured { get; }

    /// <summary>Uploads one recording. Returns false (and logs) instead of throwing: a failed upload
    /// must never cost the candidate feedback that is already paid for.</summary>
    Task<bool> TryUploadAsync(string blobName, string contentType, byte[] data);

    /// <summary>A read-only link that expires after validFor, or null (logged) when one cannot be signed.</summary>
    Task<string?> ReadUrlAsync(string blobName, TimeSpan validFor);
}

/// <summary>Blob Storage through the app's managed identity — no account key anywhere. On a developer
/// machine DefaultAzureCredential falls back to the az login / Visual Studio account. Either identity
/// needs Storage Blob Data Contributor on the account: it uploads, and it asks for the user
/// delegation key that signs playback links.</summary>
public class BlobAudioStore : IAudioStore
{
    private readonly BlobServiceClient? _service;
    private readonly BlobContainerClient? _container;
    private readonly ILogger<BlobAudioStore> _logger;
    private UserDelegationKey? _delegationKey;

    public BlobAudioStore(IConfiguration config, ILogger<BlobAudioStore> logger)
    {
        _logger = logger;
        var account = config["AudioStorageAccount"];
        var containerName = config["AudioStorageContainer"];
        if (string.IsNullOrWhiteSpace(account) || string.IsNullOrWhiteSpace(containerName))
            return;
        _service = new BlobServiceClient(new Uri($"https://{account}.blob.core.windows.net"), new DefaultAzureCredential());
        // The container is provisioned with the account; creating it here would need a wider role
        // than the one that writes blobs.
        _container = _service.GetBlobContainerClient(containerName);
    }

    public bool IsConfigured => _container is not null;

    public async Task<bool> TryUploadAsync(string blobName, string contentType, byte[] data)
    {
        if (_container is null)
            return false;
        try
        {
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

    public async Task<string?> ReadUrlAsync(string blobName, TimeSpan validFor)
    {
        if (_service is null || _container is null)
            return null;
        try
        {
            var sas = new BlobSasBuilder
            {
                BlobContainerName = _container.Name,
                BlobName = blobName,
                Resource = "b",
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-5), // tolerate a little clock skew
                ExpiresOn = DateTimeOffset.UtcNow.Add(validFor),
            };
            sas.SetPermissions(BlobSasPermissions.Read);
            var key = await DelegationKeyAsync();
            return new BlobUriBuilder(_container.GetBlobClient(blobName).Uri)
            {
                Sas = sas.ToSasQueryParameters(key, _service.AccountName),
            }.ToUri().ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Signing a playback link for {Blob} failed", blobName);
            return null; // the feedback page just shows no player for it
        }
    }

    /// <summary>With no account key, links are signed with a user delegation key. One key signs every
    /// link; Azure allows up to seven days, so a day's worth is fetched and reused until under an hour
    /// is left — always longer than any link it signs.</summary>
    // ponytail: two first reads racing both fetch a key; harmless, the later one wins.
    private async Task<UserDelegationKey> DelegationKeyAsync()
    {
        if (_delegationKey is null || _delegationKey.SignedExpiresOn < DateTimeOffset.UtcNow.AddHours(1))
            _delegationKey = (await _service!.GetUserDelegationKeyAsync(
                DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddDays(1))).Value;
        return _delegationKey;
    }
}
