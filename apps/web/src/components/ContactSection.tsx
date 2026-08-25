import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchJsonWithRetry } from '../lib/publicApi';
import { SocialLinks, type SocialProfile } from './SocialLinks';
import { TurnstileWidget } from './TurnstileWidget';

type ContactState = 'idle' | 'sending' | 'sent' | 'error';

export function ContactSection() {
  const [profile, setProfile] = useState<SocialProfile>({});
  const [state, setState] = useState<ContactState>('idle');
  const [status, setStatus] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetVersion, setTurnstileResetVersion] = useState(0);
  const updateTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  useEffect(() => {
    fetchJsonWithRetry<SocialProfile>('/api/v1/public/profile')
      .then(setProfile)
      .catch(() => setProfile({}));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!turnstileToken) {
      setState('error');
      setStatus('Complete the verification before sending your message.');
      return;
    }
    setState('sending');
    setStatus('Sending your message…');
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/v1/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, turnstileToken }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message || 'The message could not be sent.');
      form.reset();
      setTurnstileToken(null);
      setTurnstileResetVersion((version) => version + 1);
      setState('sent');
      setStatus(body.message || 'Your message was sent successfully.');
    } catch (error) {
      setTurnstileToken(null);
      setTurnstileResetVersion((version) => version + 1);
      setState('error');
      setStatus(error instanceof Error ? error.message : 'The message could not be sent.');
    }
  }

  return (
    <section id="contact" className="contact-observatory" aria-labelledby="contact-heading">
      <div className="contact-orbit" aria-hidden="true" />
      <div className="contact-intro">
        <p className="section-eyebrow">Contact</p>
        <h2 id="contact-heading">
          LET&apos;S BUILD SOMETHING
          <br />
          THAT CAN BE PROVEN.
        </h2>
        <p>
          Have a role, collaboration, engineering problem, or thoughtful idea? Send a direct message
          here.
        </p>
        <div className="contact-socials" role="group" aria-label="Usman Ali social profiles">
          <SocialLinks profile={profile} />
        </div>
      </div>

      <form className="contact-form" onSubmit={(event) => void submit(event)}>
        <div className="contact-fields">
          <label>
            <span>Name</span>
            <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
        </div>
        <label>
          <span>
            Subject <small>(optional)</small>
          </span>
          <input name="subject" maxLength={150} />
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" required minLength={10} maxLength={4000} rows={6} />
        </label>
        <label className="contact-honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <TurnstileWidget
          resetVersion={turnstileResetVersion}
          onTokenChange={updateTurnstileToken}
        />
        <div className="contact-submit-row">
          <button
            className="hero-primary"
            type="submit"
            disabled={state === 'sending' || !turnstileToken}
          >
            {state === 'sending' ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span>
          </button>
          <span
            className={`contact-status contact-status--${state}`}
            role="status"
            aria-live="polite"
          >
            {status}
          </span>
        </div>
        <small>Your email is used only to reply to this message.</small>
      </form>
    </section>
  );
}
