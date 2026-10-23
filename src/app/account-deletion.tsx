import LegalDocumentScreen from '../modules/legal/components/LegalDocumentScreen';
import { ACCOUNT_DELETION, ACCOUNT_DELETION_MAILTO } from '../modules/legal/legalContent';

// Deletion is requested by email to the verified support inbox and processed by the Strike
// team — the vendor app has no deletion API, so this screen never claims to delete anything
// itself. It only prepares the request email.
export default function AccountDeletionScreen() {
  return (
    <LegalDocumentScreen
      doc={ACCOUNT_DELETION}
      action={{ label: 'Email a Deletion Request', icon: 'mail-outline', url: ACCOUNT_DELETION_MAILTO }}
    />
  );
}
