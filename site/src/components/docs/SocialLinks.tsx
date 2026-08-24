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
          <Icon name="lucide:github" width={20} height={20} />
        </a>
      ))}
    </span>
  );
}
