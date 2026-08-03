# WordPress Profile

- `Tease:` Treat code, content, database state, caches, and live hosting as
  separate release surfaces.
- `Lede:` This profile adds WordPress Coding Standards configuration, PHP syntax
  verification, managed-host deployment boundaries, and a release-evidence
  template without assuming plugin, classic theme, block theme, or WPEngine.
- `Why it matters:`
  - A file deploy can leave database, cache, search, media, or generated assets
    stale.
  - WordPress input, capability, nonce, query, escaping, translation, and
    compatibility rules are security and interoperability concerns.
- `Go deeper:`
  - Install project-reviewed PHPCS and WordPress Coding Standards versions
    through Composer.
  - Add PHPUnit and browser checks appropriate to the project.

## Adds

- `phpcs.xml.dist`
- `scripts/wordpress-verify.sh`
- `docs/operations/wordpress.md`
- WordPress release-verification template
- active agent guidance under `.starter/addenda/`

## Primary references

- [WordPress PHP coding standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- [WordPress PHP documentation standards](https://developer.wordpress.org/coding-standards/inline-documentation-standards/php/)
- [WordPress block-editor testing overview](https://developer.wordpress.org/block-editor/contributors/code/testing-overview/)
- [Plugin Check](https://developer.wordpress.org/plugins/developer-tools/helper-plugins/)
