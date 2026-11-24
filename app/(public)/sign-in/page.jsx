import { Suspense } from 'react'
import SignInClient from './SignInClient'

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-md animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="mx-auto h-8 w-40 rounded bg-slate-200" />
          <div className="h-11 rounded-lg bg-slate-100" />
          <div className="h-11 rounded-lg bg-slate-100" />
          <div className="h-11 rounded-lg bg-slate-200" />
        </div>
      </div>
    }>
      <SignInClient />
    </Suspense>
  )
}
