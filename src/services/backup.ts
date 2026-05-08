import * as FileSystem from 'expo-file-system';

export async function localBackup(data: unknown) {

  const permissions =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (permissions.granted) {
    const uri = permissions.directoryUri;

    const fileUri =
      await FileSystem.StorageAccessFramework.createFileAsync(
        uri,
        'backup.json',
        'application/json'
      );

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(data)
    );
  }
}
