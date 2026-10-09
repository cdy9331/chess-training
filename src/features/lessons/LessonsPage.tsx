import { Link, useParams } from 'react-router';
import { findLesson } from '../../content/lessons';
import { LessonList } from './LessonList';
import { LessonView } from './LessonView';
import styles from './Lessons.module.css';

export function LessonsPage() {
  const { lessonId } = useParams();
  if (!lessonId) return <LessonList />;
  const lesson = findLesson(lessonId);
  if (!lesson) {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>레슨을 찾을 수 없어요</h1>
        <Link to="/lessons">← 레슨 목록</Link>
      </section>
    );
  }
  return <LessonView key={lesson.id} lesson={lesson} />;
}
