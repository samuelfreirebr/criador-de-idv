import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { EditorProvider } from "@/components/editor/store";
import { carregarProjeto } from "@/lib/queries";

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projeto = await carregarProjeto(id);
  if (!projeto) notFound();

  return (
    <EditorProvider projeto={projeto}>
      <Editor />
    </EditorProvider>
  );
}
