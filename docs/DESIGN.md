# Reference direction

The first supplied reference informs the Western typography, muted olive and sepia palette, pale yellow headings, photographic masthead, and fine paper texture. The theme continues through the article reader, editor, comments, and account dialogs. Article excerpts end on word boundaries. Topic buttons expose their selection with `aria-pressed`.

## Typography

The reference names **Belion Radego**. This implementation uses **Rye**, an open font with a related Western display character, as an approximation. It is not the exact reference typeface. The original Belion Radego family is listed by [Denu Studios](https://denustudios.com/belion-radego-victorian-typeface/) with separate licensing; no licensed copy was supplied or bundled.

Rye is included locally from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/rye). Its SIL Open Font License is preserved in `static/fonts/OFL-Rye.txt`. Body text uses Georgia with a serif fallback. Navigation and controls use system sans-serif fonts; secondary labels use Courier New.

## Photography

The masthead uses a [Monument Valley rider photograph by Peter Thomas on Unsplash](https://unsplash.com/photos/person-on-horseback-in-a-vast-desert-landscape--lzlMB4Ks94), downloaded from `https://images.unsplash.com/photo-1778546979009-e1ecaf646af5` with `auto=format&fit=crop&w=1800&q=85`.

See the [Unsplash license](https://unsplash.com/license). The original downloaded image is bundled in `static/images/rider.jpg`; sepia and brightness treatments are applied in CSS. The supplied reference screenshot is not embedded in the application.

## Verification

Browser checks covered font loading, topic filters, search, reading, registration, draft saving, publication, and comments. Screens were checked at 1440px, 390px, and 320px; no horizontal overflow or JavaScript errors were observed. API tests continue to pass. Screenshots use local sample data.
