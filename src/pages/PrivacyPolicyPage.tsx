import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="hh-auth">
      <div className="hh-auth__wrap" style={{ maxWidth: '800px' }}>
        <div className="hh-card hh-auth__card" style={{ padding: '32px 24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Privacybeleid</h1>
          <p style={{ color: 'var(--hh-muted)', fontSize: '14px', marginBottom: '32px' }}>
            Laatst bijgewerkt: 12 januari 2026
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>1. Inleiding</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              HabitHero ("wij", "ons" of "de applicatie") respecteert uw privacy en zet zich in voor de bescherming van uw persoonsgegevens. 
              Dit privacybeleid legt uit hoe wij uw persoonsgegevens verzamelen, gebruiken en beschermen in overeenstemming met de 
              Algemene Verordening Gegevensbescherming (AVG/GDPR).
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>2. Welke gegevens verzamelen wij?</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>Wij verzamelen de volgende gegevens:</p>
            <ul style={{ lineHeight: '1.8', paddingLeft: '20px', marginBottom: '16px' }}>
              <li><strong>Accountgegevens:</strong> e-mailadres, naam, gebruikersrol (student/teacher/admin)</li>
              <li><strong>Educatieve gegevens:</strong> voortgang, taken, inzendingen, behaalde resultaten</li>
              <li><strong>Gebruiksgegevens:</strong> inloggegevens, activiteiten binnen de applicatie</li>
              <li><strong>Technische gegevens:</strong> IP-adres, browsertype, apparaatinformatie</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>3. Waarvoor gebruiken wij uw gegevens?</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>Uw gegevens worden uitsluitend gebruikt voor:</p>
            <ul style={{ lineHeight: '1.8', paddingLeft: '20px', marginBottom: '16px' }}>
              <li>Het verlenen van toegang tot de educatieve platformen</li>
              <li>Het bijhouden van uw voortgang en prestaties</li>
              <li>Het faciliteren van communicatie tussen studenten en docenten</li>
              <li>Het verbeteren van de applicatie en gebruikerservaring</li>
              <li>Het voldoen aan wettelijke verplichtingen</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>4. Rechtsgrondslag voor verwerking</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Wij verwerken uw persoonsgegevens op basis van:
            </p>
            <ul style={{ lineHeight: '1.8', paddingLeft: '20px', marginBottom: '16px' }}>
              <li><strong>Toestemming:</strong> U geeft toestemming bij het aanmaken van uw account</li>
              <li><strong>Contractuele noodzaak:</strong> Voor het leveren van onze diensten</li>
              <li><strong>Gerechtvaardigd belang:</strong> Voor het verbeteren van onze diensten</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>5. Met wie delen wij uw gegevens?</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Wij delen uw gegevens <strong>alleen</strong> met:
            </p>
            <ul style={{ lineHeight: '1.8', paddingLeft: '20px', marginBottom: '16px' }}>
              <li>Uw docenten en schooladministratie (alleen educatieve gegevens)</li>
              <li>Firebase/Google Cloud Platform (voor hosting en authenticatie)</li>
              <li>Geen derden voor marketing of reclame doeleinden</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>6. Beveiliging van uw gegevens</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Wij nemen passende technische en organisatorische maatregelen om uw gegevens te beschermen tegen 
              ongeautoriseerde toegang, wijziging, openbaarmaking of vernietiging, waaronder:
            </p>
            <ul style={{ lineHeight: '1.8', paddingLeft: '20px', marginBottom: '16px' }}>
              <li>Versleutelde verbindingen (HTTPS/SSL)</li>
              <li>Firebase Authentication voor veilige toegang</li>
              <li>Firestore Security Rules voor gegevensbeveiliging</li>
              <li>Regelmatige beveiligingsupdates</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>7. Uw rechten onder de AVG/GDPR</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>U heeft de volgende rechten:</p>
            <ul style={{ lineHeight: '1.8', paddingLeft: '20px', marginBottom: '16px' }}>
              <li><strong>Recht op inzage:</strong> U kunt een kopie opvragen van uw persoonsgegevens</li>
              <li><strong>Recht op rectificatie:</strong> U kunt uw gegevens laten corrigeren</li>
              <li><strong>Recht op verwijdering:</strong> U kunt verzoeken om uw gegevens te verwijderen</li>
              <li><strong>Recht op beperking:</strong> U kunt de verwerking van uw gegevens beperken</li>
              <li><strong>Recht op dataportabiliteit:</strong> U kunt uw gegevens in een leesbaar formaat ontvangen</li>
              <li><strong>Recht van bezwaar:</strong> U kunt bezwaar maken tegen de verwerking</li>
            </ul>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Om deze rechten uit te oefenen, neem contact op via uw docent of schooladministratie.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>8. Bewaartermijn</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Wij bewaren uw gegevens zolang uw account actief is en gedurende de wettelijk vereiste bewaartermijn 
              voor educatieve records. Na verwijdering van uw account worden uw gegevens binnen 30 dagen permanent verwijderd.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>9. Cookies en tracking</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Wij gebruiken alleen essentiële cookies voor authenticatie en sessie-beheer. 
              Er worden geen tracking cookies of analytics cookies van derden gebruikt.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>10. Wijzigingen in dit privacybeleid</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Wij kunnen dit privacybeleid van tijd tot tijd bijwerken. Belangrijke wijzigingen worden via de applicatie 
              gecommuniceerd. De datum van de laatste wijziging staat bovenaan dit document.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>11. Contact</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              Voor vragen over dit privacybeleid of uw persoonsgegevens, neem contact op met uw school of docent.
            </p>
            <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
              U heeft ook het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens als u van mening bent 
              dat wij uw gegevens niet correct verwerken.
            </p>
          </section>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--hh-border)', textAlign: 'center' }}>
            <Link to="/login" className="hh-btn hh-btn-secondary">
              Terug naar login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
