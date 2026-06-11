import { FileLock2, FileText, Plane, Pencil, ShieldCheck, Ticket, Hotel, FileQuestion, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, SectionHeader, formInputClass, formTextareaClass, formSelectClass } from "../components/ui";
import { deleteDocument, upsertDocument } from "../lib/supabase";
import type { AppData, DocumentCategory, DocumentInput, TravelDocument } from "../types";

const documentCategories: DocumentCategory[] = ["flight_ticket", "hotel_booking", "passport", "insurance", "attraction_ticket", "other"];

function DocumentCategoryIcon({ category }: { category: string }) {
  const cls = "h-5 w-5";
  if (category === "flight_ticket") return <Plane className={cls} />;
  if (category === "hotel_booking") return <Hotel className={cls} />;
  if (category === "passport") return <ShieldCheck className={cls} />;
  if (category === "insurance") return <ShieldCheck className={cls} />;
  if (category === "attraction_ticket") return <Ticket className={cls} />;
  return <FileQuestion className={cls} />;
}

const DOC_CATEGORY_STYLE: Record<string, string> = {
  flight_ticket: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  hotel_booking: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  passport: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  insurance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  attraction_ticket: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
};

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

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/8 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-warning">
          Sensitive documents should be protected. Store only what the family needs, mark private files carefully, and keep RLS policies enabled.
        </p>
      </div>

      {data.documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No documents uploaded"
          body="Upload PDFs or images for tickets, bookings, passports, insurance, and attraction passes."
          action={canEdit ? <Button variant="secondary" onClick={() => setShowForm(true)}>Add your first document</Button> : null}
        />
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

  const iconStyle = DOC_CATEGORY_STYLE[document.category] ?? DOC_CATEGORY_STYLE.other;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${iconStyle}`}>
          {document.isPrivate
            ? <FileLock2 className="h-5 w-5" aria-hidden="true" />
            : <DocumentCategoryIcon category={document.category} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-primary">{document.fileName}</h3>
          <p className="mt-0.5 text-xs text-muted">{document.fileType}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${iconStyle} ring-current/20`}>
              {document.category.replace(/_/g, " ")}
            </span>
            {document.isPrivate ? (
              <Badge tone="red">Private</Badge>
            ) : (
              <Badge tone="slate">Shared</Badge>
            )}
          </div>
          {canEdit ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
              <Button variant="ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
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
        <Field label="File name"><input className={formInputClass} value={form.fileName} onChange={(event) => update("fileName", event.target.value)} /></Field>
        <Field label="File type"><input className={formInputClass} value={form.fileType} onChange={(event) => update("fileType", event.target.value)} /></Field>
        <Field label="Category">
          <select className={formSelectClass} value={form.category} onChange={(event) => update("category", event.target.value as DocumentCategory)}>
            {documentCategories.map((category) => <option key={category} value={category}>{category.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Field label="Linked itinerary item">
          <select className={formSelectClass} value={form.itineraryItemId ?? ""} onChange={(event) => update("itineraryItemId", event.target.value || undefined)}>
            <option value="">None</option>{data.itinerary.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </Field>
        <Field label="Upload file">
          <input type="file" className={`${formInputClass} py-2`} onChange={(event) => update("file", event.target.files?.[0] ?? null)} />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-primary hover:bg-muted transition-colors">
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
