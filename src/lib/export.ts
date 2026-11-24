import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Android/iOS: writes the CSV to a temporary file and opens the share sheet
// (save to Files, send by WhatsApp, email, Drive…).
export async function exportCsv(filename: string, csv: string) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export PaisaBook data' });
}
