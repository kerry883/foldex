import NoteContentInner from '@/components/tabs/content/NoteContentInner'
import { createFileRoute } from '@tanstack/react-router'

type NoteSearchParams = {
  folderId?: string;
}

export const Route = createFileRoute('/_app/note/$noteId')({
  component: NotePage,
  validateSearch: (search: Record<string, unknown>): NoteSearchParams => {
    return {
      folderId: search.folderId as string | undefined,
    }
  },
})

function NotePage() {
  const {noteId}=Route.useParams();
  const {folderId}=Route.useSearch();
  return <NoteContentInner noteId={noteId} folderId={folderId} />
}
