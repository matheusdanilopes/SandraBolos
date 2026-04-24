import { ClienteForm } from "../ClienteForm";

export default function NovoClientePage() {
  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Novo Cliente</h1>
      <ClienteForm />
    </div>
  );
}
