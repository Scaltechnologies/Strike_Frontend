import LegalDocumentScreen from '../modules/legal/components/LegalDocumentScreen';
import { PRIVACY_POLICY } from '../modules/legal/legalContent';

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen doc={PRIVACY_POLICY} />;
}
