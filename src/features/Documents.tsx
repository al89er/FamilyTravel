import { FileLock2, FileText, Pencil, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader } from "../components/ui";
import { deleteDocument, upsertDocument } from "../lib/supabase";
import type { AppData, DocumentCategory, DocumentInput, TravelDocument } from "../types";

const documentCategories: DocumentCategory[] = ["flight_ticket", "hotel_booking", "passport", "insurance", "attraction_ticket", "other"];

export function Documents({ data, canEdit = false, onRefresh }: { data: AppData; canEdit?: boolean; onRefresh?: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Documents Vault"
        eyebrow="Tickets, passports, insurance"
        action={canEdit ? (
          <Button onClick={() => setShowForm((value) => !value)}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
        ) : null}
      />
      {canEdit && showForm ? <DocumentForm data={data} onCancel={() => setShowForm(false)} onSaved={async () => { setShowForm(false); await onRefresh?.(); }} /> : null}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Sensitive documents should be protected. Store only what the family needs, mark private files carefully, and keep RLS policies enabled.
      </div>
      {data.documents.length === 0 ? (
        <EmptyState title="No documents uploaded" body="Upload PDFs or images for tickets, bookings, passports, insurance, and attraction passes." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.documents.map((document) => (
            <DocumentCard key={document.id} data={data} document={document} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({ data, document, canEdit, onRefresh }: { data: AppData; document: TravelDocument; canEdit: boolean; onRefresh?: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this document?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDocument(data.trip.id, document.id, document.storagePath);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <DocumentForm data={data} document={document} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onRefresh?.(); }} />;
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {document.isPrivate ? <FileLock2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-slate-950">{document.fileName}</h3>
          <p className="mt-1 text-sm text-slate-600">{document.fileType}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="brand">{document.category.replace("_", " ")}</Badge>
            <Badge tone={document.isPrivate ? "red" : "slate"}>{document.isPrivate ? "Private" : "Shared"}</Badge>
          </div>
          {canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
              <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function DocumentForm({ data, document, onSaved, onCancel }: { data: AppData; document?: TravelDocument; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<DocumentInput>({
    fileName: document?.fileName ?? "",
    fileType: document?.fileType ?? "application/pdf",
    category: document?.category ?? "other",
    itineraryItemId: document?.itineraryItemId,
    isPrivate: document?.isPrivate ?? false,
    file: null
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof DocumentInput>(key: K, value: DocumentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fileName.trim()) {
      setError("File name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertDocument(data.trip.id, { ...form, fileName: form.fileName.trim(), fileType: form.fileType.trim() || "application/octet-stream" }, document?.id);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
        <Field label="File name"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.fileName} onChange={(event) => update("fileName", event.target.value)} /></Field>
        <Field label="File type"><input className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.fileType} onChange={(event) => update("fileType", event.target.value)} /></Field>
        <Field label="Category"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.category} onChange={(event) => update("category", event.target.value as DocumentCategory)}>{documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
        <Field label="Linked itinerary item"><select className="min-h-11 w-full rounded-lg border border-slate-300 px-3" value={form.itineraryItemId ?? ""} onChange={(event) => update("itineraryItemId", event.target.value || undefined)}><option value="">None</option>{data.itinerary.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
        <Field label="Upload file"><input type="file" className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => update("file", event.target.files?.[0] ?? null)} /></Field>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
          <input type="checkbox" checked={form.isPrivate} onChange={(event) => update("isPrivate", event.target.checked)} />
          Private document
        </label>
        {error ? <div className="md:col-span-2"><ErrorState message={error} /></div> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>Save</Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
