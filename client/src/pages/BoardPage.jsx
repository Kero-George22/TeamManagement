import { useParams } from 'react-router-dom';
import SectionPage from './SectionPage';

export default function BoardPage() {
  const { id } = useParams();
  return <SectionPage embedded={false} forcedProjectId={id} />;
}
