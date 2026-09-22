import { redirect } from 'next/navigation'

export default function CreatePage() {
  // Direct access to /app/create redirects to /app where the creation modal is readily available
  redirect('/app')
}
