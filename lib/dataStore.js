/**
 * lib/dataStore.js
 *
 * Stores the latest generated batch as a single JSON file ("latest.json")
 * in an Azure Blob Storage container called "sen-weather".
 *
 * Keeps the same two methods the file-based version - setJSON(key,
 * value) and get(key) - so lib/generate.js and the functions don't change.
 *
 * How it connects:
 *   - In Azure: uses the Function App's managed identity (no keys). The
 *     storage account name comes from STORAGE_ACCOUNT_NAME, or falls back
 *     to AzureWebJobsStorage__accountName, which Azure sets automatically
 *     when the app's host storage uses managed identity.
 *   - Locally: set STORAGE_CONNECTION_STRING (e.g. "UseDevelopmentStorage=true"
 *     for the Azurite emulator) and it uses that instead.
 *
 * The container is created on first write if it doesn't exist yet.
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

const CONTAINER_NAME = 'sen-weather';

let containerClient = null;

function getContainerClient() {
  if (containerClient) return containerClient;

  const connectionString = process.env.STORAGE_CONNECTION_STRING;
  let serviceClient;

  if (connectionString) {
    serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  } else {
    const accountName =
      process.env.STORAGE_ACCOUNT_NAME || process.env.AzureWebJobsStorage__accountName;
    if (!accountName) {
      throw new Error(
        'No storage configured - set STORAGE_ACCOUNT_NAME (in Azure) or STORAGE_CONNECTION_STRING (locally).'
      );
    }
    serviceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );
  }

  containerClient = serviceClient.getContainerClient(CONTAINER_NAME);
  return containerClient;
}

function getWeatherStore() {
  const container = getContainerClient();

  return {
    async setJSON(key, value) {
      await container.createIfNotExists();
      const body = JSON.stringify(value);
      await container.getBlockBlobClient(`${key}.json`).upload(body, Buffer.byteLength(body), {
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
    },

    // Returns the parsed JSON, or null if nothing has been generated yet.
    // The second argument is accepted (and ignored) for compatibility with
    // the earlier call signature: store.get('latest', { type: 'json' }).
    async get(key) {
      const blob = container.getBlobClient(`${key}.json`);
      if (!(await blob.exists())) return null;
      const buffer = await blob.downloadToBuffer();
      return JSON.parse(buffer.toString('utf8'));
    },
  };
}

module.exports = { getWeatherStore };
