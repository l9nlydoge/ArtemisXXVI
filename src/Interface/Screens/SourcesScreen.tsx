import { useMemo } from 'react'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { SourceBook } from '../SourceBook'

export function SourcesScreen() {
  const translator = useTranslator()
  const closeSources = useGameStore((state) => state.closeSources)
  const book = useMemo(() => new SourceBook(translator), [translator])

  return (
    <main className="ReportScreen SourcesScreen">
      <header className="Panel">
        <h1>{translator.t('Sources.Title')}</h1>
        <p>{translator.t('Sources.Intro')}</p>
      </header>

      {book.sections.map((section) => (
        <section key={section.id} className="Panel">
          <h2>{translator.t(`Sources.Section.${section.id}`)}</h2>
          {section.noteKey && <p className="Hint">{translator.t(section.noteKey)}</p>}
          <table className="SourceTable">
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td>{row.figures}</td>
                  <td className={`Is${row.status}`}>{translator.t(`Sources.${row.status}`)}</td>
                  <td>
                    {row.links.map((link, index) => (
                      <a key={link} href={link} target="_blank" rel="noreferrer">{translator.t('Sources.Link', { number: index + 1 })}</a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <footer className="ReportBar">
        <button type="button" className="Primary" onClick={closeSources}>{translator.t('Sources.Back')}</button>
      </footer>
    </main>
  )
}
