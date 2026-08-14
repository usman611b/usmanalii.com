export type SocialProfile = {
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
};

const platforms = [
  {
    key: 'githubUrl',
    name: 'GitHub',
    className: 'social-link--github',
    path: 'M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.11.79-.25.79-.56v-2.16c-3.22.7-3.9-1.36-3.9-1.36-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.76.41-1.27.75-1.56-2.57-.29-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75-.01c2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z',
  },
  {
    key: 'linkedinUrl',
    name: 'LinkedIn',
    className: 'social-link--linkedin',
    path: 'M5.34 7.99H1.46V20h3.88V7.99ZM3.4 2A2.25 2.25 0 1 0 3.4 6.5 2.25 2.25 0 0 0 3.4 2ZM20 13.12c0-3.62-1.93-5.3-4.51-5.3-2.08 0-3.01 1.14-3.53 1.95V7.99H8.08V20h3.88v-5.95c0-1.57.3-3.09 2.25-3.09 1.92 0 1.94 1.8 1.94 3.19V20H20v-6.88Z',
  },
  {
    key: 'xUrl',
    name: 'X',
    className: 'social-link--x',
    path: 'M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.25-8.29L2.96 2H9.36l4.42 5.84L18.9 2Zm-1.09 17.84h1.73L8.42 4.05H6.57l11.24 15.79Z',
  },
  {
    key: 'instagramUrl',
    name: 'Instagram',
    className: 'social-link--instagram',
    path: 'M7.2 2h9.6A5.2 5.2 0 0 1 22 7.2v9.6a5.2 5.2 0 0 1-5.2 5.2H7.2A5.2 5.2 0 0 1 2 16.8V7.2A5.2 5.2 0 0 1 7.2 2Zm-.18 2A3.02 3.02 0 0 0 4 7.02v9.96A3.02 3.02 0 0 0 7.02 20h9.96A3.02 3.02 0 0 0 20 16.98V7.02A3.02 3.02 0 0 0 16.98 4H7.02Zm10.43 1.5a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  },
] as const;

export function SocialLinks({ profile }: { profile: SocialProfile }) {
  return (
    <>
      {platforms.map(({ key, name, className, path }) => {
        const icon = (
          <>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={path} />
            </svg>
            <span>{name}</span>
          </>
        );
        const url = profile[key];
        return url ? (
          <a
            className={`social-link ${className}`}
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open Usman Ali on ${name}`}
          >
            {icon}
          </a>
        ) : (
          <span
            className={`social-link social-link--unconfigured ${className}`}
            key={key}
            aria-disabled="true"
            title={`Add the ${name} URL in Command Center → Profile & Identity`}
          >
            {icon}
          </span>
        );
      })}
    </>
  );
}
