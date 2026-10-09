import { Link } from 'react-router';
import { PagePlaceholder } from '../shared/PagePlaceholder';

export function NotFoundPage() {
  return (
    <PagePlaceholder title="페이지를 찾을 수 없어요">
      <Link to="/">홈으로 돌아가기</Link>
    </PagePlaceholder>
  );
}
