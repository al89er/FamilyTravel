import { FileLock2, FileText, Upload } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionHeader } from "../components/ui";
import type { AppData } from "../types";

export function Documents({ data }: { data: AppData }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Documents Vault"
        eyebrow="Tickets, passports, insurance"
        action={
          <Button>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
        }
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Sensitive documents should be protected. Store only what the family needs, mark private files carefully, and keep RLS policies enabled.
      </div>
      {data.documents.length === 0 ? (
        <EmptyState title="No documents uploaded" body="Upload PDFs or images for tickets, bookings, passports, insurance, and attraction passes." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.documents.map((document) => (
            <Card key={document.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  {document.isPrivate ? <FileLock2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-slate-950">{document.fileName}</h3>
                  <p className="mt-1 text-sm text-slate-600">{document.fileType}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{document.category.replace("_", " ")}</Badge>
                    <Badge tone={document.isPrivate ? "red" : "slate"}>{document.isPrivate ? "Private" : "Shared"}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
