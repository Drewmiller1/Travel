import VacationPlanner from "./VacationPlanner";
export default function App() {
  return <VacationPlanner />;
}
```

**5. Set environment variables**
StackBlitz with Vite reads `.env` files. Create a file called `.env` in the project root (not inside `src/`) and add:
```
VITE_SUPABASE_URL=https://qkkeiuechmsgvyiigfuq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Bi5eThz1CqDXhXZG_PJchA_Bd7prSbE