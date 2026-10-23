import LegalDocumentScreen from '../modules/legal/components/LegalDocumentScreen';
import { TERMS } from '../modules/legal/legalContent';

export default function TermsScreen() {
  return <LegalDocumentScreen doc={TERMS} />;
}
