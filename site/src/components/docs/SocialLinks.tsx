interface SocialLinkItem {
  icon: string;
  url: string;
  name: string;
}

interface SocialLinksProps {
  links: SocialLinkItem[];
}

export default function SocialLinks({ links }: SocialLinksProps) {
  if (!links || links.length === 0) return <span />;

  return (
    <span>
      {links.map((link) => (
        <a class="social-link" href={link.url} aria-label={link.name || 'GitHub'}>
          <Icon name="tabler:brand-github" width={18} height={18} />
        </a>
      ))}
    </span>
  );
}
