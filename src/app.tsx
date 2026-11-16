import { useHash, go } from './state';
import { Icons, Toasts } from './ui/components';
import { Today } from './ui/Today';
import { Workout } from './ui/Workout';
import { History, WorkoutDetail } from './ui/History';
import { Progress } from './ui/Progress';
import { PlanScreen, DayEditor } from './ui/Plan';
import { Library, ExerciseDetail } from './ui/Library';
import { SettingsScreen } from './ui/Settings';

const TABS = [
  { path: '/heute', label: 'Heute', icon: Icons.today },
  { path: '/verlauf', label: 'Verlauf', icon: Icons.history },
  { path: '/fortschritt', label: 'Fortschritt', icon: Icons.progress },
  { path: '/plan', label: 'Plan', icon: Icons.plan },
  { path: '/einstellungen', label: 'Einstellungen', icon: Icons.settings },
];

export function App() {
  const hash = useHash();
  const [, root, arg] = hash.split('/');
  let screen;
  let showTabs = true;
  switch (root) {
    case 'training': screen = <Workout />; showTabs = false; break;
    case 'verlauf': screen = arg ? <WorkoutDetail id={arg} /> : <History />; break;
    case 'fortschritt': screen = <Progress />; break;
    case 'plan': screen = arg ? <DayEditor dayId={arg} /> : <PlanScreen />; break;
    case 'bibliothek': screen = <Library />; break;
    case 'uebung': screen = <ExerciseDetail id={arg} />; break;
    case 'einstellungen': screen = <SettingsScreen />; break;
    default: screen = <Today />;
  }
  const activeTab = root === 'bibliothek' || root === 'uebung' ? '/plan' : `/${root || 'heute'}`;
  return (
    <>
      {screen}
      {showTabs && (
        <nav class="tabbar" aria-label="Hauptnavigation">
          {TABS.map((t) => (
            <button type="button" class={activeTab === t.path ? 'on' : ''} onClick={() => go(t.path)} aria-current={activeTab === t.path ? 'page' : undefined}>
              <t.icon /> {t.label}
            </button>
          ))}
        </nav>
      )}
      <Toasts />
    </>
  );
}
