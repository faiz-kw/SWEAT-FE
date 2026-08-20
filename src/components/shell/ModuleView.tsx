import { CrudModule } from "@/modules/CrudModule";

export function ModuleView({ path }: { path: string }) {
  return <CrudModule path={path} />;
}
