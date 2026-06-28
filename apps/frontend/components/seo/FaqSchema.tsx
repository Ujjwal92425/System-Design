import { JsonLd } from './JsonLd';
import { faqSchemaJsonLd } from '../../lib/seo';

export function FaqSchema({ questions }: { questions: { question: string; answer: string }[] }) {
  if (!questions.length) return null;
  return <JsonLd data={faqSchemaJsonLd(questions)} />;
}
