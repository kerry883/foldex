import ChatClient from '@/components/aicomponents/chat-client'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/chat/$chatId')({
  component: ChatPage,
})

function ChatPage() {
  const {chatId}= Route.useParams()
  return <ChatClient chatId={chatId} />
}
