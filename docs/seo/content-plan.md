# Content plan — backlink justification (agilescienceapp.it · modoristorante.it)

## Honest data caveat (read first)

Both Ahrefs exports provided are **referring-domains** reports, not the
**Backlinks** report. They list *which domains* link, **not which target
page** receives each link. So content **cannot be mapped 1:1 to the exact
backlinked URL**. To do per-page justification, export Ahrefs →
*Backlinks* with the `Target URL` + `Referring page URL` columns.

Until then this plan is **thematic**: produce evergreen content that
makes the *legitimate* referrers' links contextually credible, and
**disavow the spam** (it must not be "justified" with content).

## Link profile

| Site | Ref. domains | Spam (Ahrefs) | + heuristic PBN | Legit/topical |
|------|--------------|---------------|-----------------|---------------|
| modoristorante.it | 254 | 196 | 210 total disavow | ~44 (local IT food/events/press) |
| agilescienceapp.it | 67 | 44 | 44 total disavow | ~23 (NASA, INAF, ASI, Wikipedia, Max-Planck) |

Disavow files: `docs/seo/disavow-modoristorante.txt`,
`docs/seo/disavow-agilescienceapp.txt` (Google GSC format; review before
submitting).

## "Numero adeguato" — driven by the *legit* profile, not raw counts

Creating ~254 posts to chase spam is wrong. The legit referrer themes
justify a focused evergreen set:

### agilescienceapp.it — 12 articles (space-science authority)
Justifies links from nasa.gov, inaf.it, asi.it, wikipedia.org, mpg.de,
astronomerstelegram.org.

| # | slug | title | category |
|---|------|-------|----------|
|1|`la-missione-agile`|La missione spaziale AGILE: cos'è e perché è importante|Missione|
|2|`astronomia-raggi-gamma`|Astronomia dei raggi gamma, spiegata|Scienza|
|3|`gamma-ray-burst`|Gamma-Ray Burst: i lampi più energetici dell'universo|Scienza|
|4|`guida-app-agilescience`|Guida all'app AGILEScience (iOS e Android)|App|
|5|`inaf-asi-ruolo-agile`|Il ruolo di INAF e ASI nella missione AGILE|Missione|
|6|`rivelatore-grid`|Come funziona il rivelatore GRID a bordo di AGILE|Tecnologia|
|7|`blazar-nuclei-galattici-attivi`|Blazar e nuclei galattici attivi osservati da AGILE|Scienza|
|8|`flare-nebulosa-granchio`|I flare della Nebulosa del Granchio|Scienza|
|9|`terrestrial-gamma-flashes`|I Terrestrial Gamma-ray Flashes (TGF)|Scienza|
|10|`astrofisica-alte-energie`|Astrofisica delle alte energie: un'introduzione|Scienza|
|11|`agile-fermi-confronto`|AGILE e Fermi: due osservatori a confronto|Missione|
|12|`divulgazione-astronomia-mobile`|Divulgare l'astronomia con le app mobili|Divulgazione|

### modoristorante.it — 15 articles (local food/events authority)
Justifies links from groupon.it, eventiesagre.it, oltrelecolonne.it,
occhionotizie.it, infonapoli24.it, solocaserta.it, localiditalia.it.

| # | slug | title | category |
|---|------|-------|----------|
|1|`cucina-napoletana-tradizione`|La cucina napoletana: tradizione e identità|Tradizione|
|2|`pizza-napoletana-verace`|La vera pizza napoletana: cosa la rende unica|Piatti|
|3|`menu-stagionale`|Perché scegliamo un menu stagionale|Filosofia|
|4|`eventi-enogastronomici-campania`|Eventi enogastronomici in Campania da non perdere|Eventi|
|5|`vini-campani-abbinamenti`|Abbinare i vini campani ai nostri piatti|Vini|
|6|`genovese-napoletana`|La Genovese: storia di un ragù napoletano|Ricette|
|7|`prodotti-tipici-presidi`|Prodotti tipici e presìdi del territorio|Territorio|
|8|`cena-aziendale`|Organizzare una cena aziendale al ristorante|Servizi|
|9|`street-food-napoli`|Guida allo street food napoletano|Territorio|
|10|`dolci-napoletani`|I dolci napoletani della tradizione|Piatti|
|11|`mozzarella-bufala-dop`|Mozzarella di bufala campana DOP: come riconoscerla|Territorio|
|12|`eventi-privati-ristorante`|Eventi privati e cerimonie: i nostri spazi|Servizi|
|13|`domenica-ragu`|La domenica del ragù: un rito di famiglia|Tradizione|
|14|`caffe-napoletano`|Il rito del caffè napoletano|Tradizione|
|15|`cucina-km-zero`|Sostenibilità e cucina a km zero|Filosofia|

## Drop-in format

Markdown in each site's `src/content/articoli/<slug>.md`, frontmatter per
`elite-astro-template/src/content.config.ts`:
`title`, `date`, `category`, `excerpt` (required); `slug`, `author`,
`readingTime`, `tags`, `hero` (optional). Sample articles:
`docs/seo/samples/`.

## Publish path (this session cannot push to `fluxgateseo/site-*`)

Pick one: (1) operator runs `/custom-prompt` with the article bodies;
(2) add `fluxgateseo/site-*` to the GitHub MCP scope; (3) upload the
site repo zips → returned as `git am` patches. Articles will be
committed here under `docs/seo/articoli/<site>/` ready to copy.
