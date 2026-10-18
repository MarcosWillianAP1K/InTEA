import { ConteudoPacientes } from "@/features/paciente/components/ConteudoPacientes";

export function PacientesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 w-full mx-auto py-2 overflow-x-hidden">
      <ConteudoPacientes />
    </div>
  );
}

export default PacientesPage;
