'use client'

export default function LoginTestPage() {
  return (
    <div>
      <h1>Login Test Page</h1>
      <p>This page has no auth dependencies</p>
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  )
}
