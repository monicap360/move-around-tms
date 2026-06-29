"use client";

// Blank, Ronyx-branded New Owner-Operator (Subhauler) Agreement for sign-ups.
// Print/Save-as-PDF friendly. Mirrors the Ronyx Logistics, LLC packet:
// Subhauler Agreement + Exhibits A/B/C, DWC-85 note, W-9 note, ACH authorization,
// Direct Deposit form, and the Truck/Trailer list.

const RULE: React.CSSProperties = { borderBottom: "1px solid #000", display: "inline-block", minWidth: 240 };
function Line({ w = 240, label }: { w?: number; label?: string }) {
  return <span style={{ display: "inline-block" }}>{label ? <span style={{ fontWeight: 600 }}>{label} </span> : null}<span style={{ ...RULE, minWidth: w }}>&nbsp;</span></span>;
}

export default function OwnerOperatorAgreement() {
  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh" }}>
      <style>{`
        @media print { .no-print { display: none !important; } .doc { box-shadow:none !important; margin:0 !important; } .page { page-break-after: always; } }
        .doc { max-width: 820px; margin: 0 auto; padding: 40px 56px; line-height: 1.5; font-size: 13px; font-family: Georgia, 'Times New Roman', serif; }
        .doc h1 { font-size: 18px; text-align:center; margin: 6px 0; letter-spacing:0.04em; }
        .doc h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 3px; }
        .doc h3 { font-size: 13px; margin: 14px 0 4px; }
        .doc p { margin: 8px 0; text-align: justify; }
        .doc .num { margin: 9px 0; }
        .doc table { width:100%; border-collapse: collapse; margin: 8px 0; font-size:12px; }
        .doc td, .doc th { border: 1px solid #555; padding: 6px 8px; text-align:left; vertical-align:top; }
        .brand { text-align:center; margin-bottom: 8px; }
        .brand .name { font-size: 22px; font-weight: 800; letter-spacing: 0.18em; color: #8a6d1d; }
        .brand .sub { font-size: 10px; letter-spacing: 0.35em; color:#8a6d1d; }
        .sigblock { margin-top: 26px; }
        .sigrow { margin: 22px 0; }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, background: "#0f172a", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, fontFamily: "system-ui, sans-serif" }}>
        <strong style={{ fontSize: 15 }}>Ronyx Logistics — New Owner-Operator Agreement (blank)</strong>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Fill in by hand or have the carrier complete it, then sign.</span>
        <button onClick={() => window.print()} style={{ marginLeft: "auto", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}>🖨️ Print / Save as PDF</button>
      </div>

      <div className="doc" style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.1)" }}>
        {/* ── Cover / Parties ── */}
        <div className="page">
          <div className="brand"><div className="name">RONYX</div><div className="sub">L O G I S T I C S&nbsp;&nbsp;L L C</div></div>
          <p style={{ textAlign: "center", fontSize: 11 }}>Ronyx Logistics, LLC — Subhauler Agreement — EXHIBIT B</p>
          <h1>SUBHAULER AGREEMENT</h1>
          <p style={{ textAlign: "center" }}>BETWEEN PRIME CARRIER: <strong>Ronyx Logistics, LLC</strong><br />AND SUBHAULER: <Line w={300} /></p>
          <p>THIS SUBHAULER AGREEMENT (the &ldquo;Subcontract&rdquo;) is executed by and between Prime Carrier, <strong>Ronyx Logistics, LLC</strong> (&ldquo;Prime Carrier&rdquo;) and Subhauler, <Line w={280} /> (&ldquo;Subhauler&rdquo;) whose information is provided below:</p>

          <table>
            <tbody>
              <tr><th style={{ width: "50%" }}>PRIME CARRIER</th><th>SUBHAULER</th></tr>
              <tr><td>Name: Ronyx Logistics, LLC</td><td>Name: ______________________________</td></tr>
              <tr><td>Address: 3741 Graves Ave, Groves, Texas 77619</td><td>Address: ____________________________</td></tr>
              <tr><td>ATTN: Veronica Y Butanda</td><td>ATTN: ______________________________</td></tr>
              <tr><td>Telephone: 432-803-8003</td><td>Telephone: __________________________</td></tr>
              <tr><td>Email: ronyxlogistics@gmail.com</td><td>Email: ______________________________</td></tr>
              <tr><td></td><td>USDOT No: __________________________</td></tr>
            </tbody>
          </table>

          <table>
            <tbody>
              <tr><th>Type of Truck</th><th>Truck Number</th></tr>
              <tr><td>Tri-Axle</td><td>&nbsp;</td></tr>
              <tr><td>Quad-Axle</td><td>&nbsp;</td></tr>
              <tr><td>Quint-Axle</td><td>&nbsp;</td></tr>
              <tr><td>End Dump</td><td>&nbsp;</td></tr>
              <tr><td>Belly</td><td>&nbsp;</td></tr>
            </tbody>
          </table>
          <p>Prime Carrier and Subhauler are sometimes collectively referred to herein as the &ldquo;Parties&rdquo; or individually as a &ldquo;Party.&rdquo; The Sub-Work described in Article I, below, shall be performed in accordance with the Subcontract Documents attached hereto as Exhibits A, B, and C, which are incorporated herein by reference.</p>

          <h3>ARTICLE I: SCOPE OF SUB-WORK</h3>
          <p>Subhauler agrees to furnish all labor, materials, equipment, property insurance, casualty insurance, and liability insurance, and/or other facilities required to complete the Sub-Work described in Exhibit A in accordance with the General Terms and Conditions (Exhibit B) and the Specific Working Conditions and Rules (Exhibit C).</p>
          <h3>ARTICLE II: THE &ldquo;SUB-CONTRACT SUM&rdquo;</h3>
          <p>Prime Carrier agrees to pay Subhauler for the strict performance of the Sub-Work in accordance with and subject to the General Terms and Conditions set forth in Exhibit B.</p>
          <h3>ARTICLE III: TIME OF PERFORMANCE</h3>
          <p>DATE OF COMMENCEMENT: ______ of ____________ 20____.<br />SUBSTANTIAL COMPLETION DATE: ______ of ____________ 20____.</p>
          <h3>ARTICLE IV: THE SERVICE AGREEMENT</h3>
          <p>Subhauler is made aware that Prime Carrier has entered into a Service Agreement with the General Contractor named below for the benefit of Owner, Ronyx Logistics, LLC, to provide transportation services for the project known as ______________________________________________.</p>
          <table><tbody>
            <tr><th>GENERAL CONTRACTOR</th><th>OWNER</th></tr>
            <tr><td>Name: __________________________</td><td>Name: Ronyx Logistics, LLC</td></tr>
            <tr><td>Address: ________________________</td><td>Address: 3741 Graves Ave, Groves, Texas 77619</td></tr>
          </tbody></table>
          <p>In consideration of the mutual covenants set forth herein, Prime Carrier and Subhauler have signed this contract, which becomes binding and effective immediately, and shall be interpreted and construed according to applicable law.</p>
          <p>SIGNED AND EXECUTED THIS ____________, 20____ (the &ldquo;Effective Date&rdquo;).</p>
          <div className="sigblock">
            <div className="sigrow"><strong>BY: PRIME CARRIER — Ronyx Logistics, LLC</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;&nbsp;______________________________ Printed Name&nbsp;&nbsp;&nbsp;&nbsp;Manager</div>
            <div className="sigrow"><strong>BY: SUBHAULER</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;&nbsp;______________________________ Printed Name&nbsp;&nbsp;&nbsp;&nbsp;Title ____________</div>
          </div>
        </div>

        {/* ── Exhibit A ── */}
        <div className="page">
          <h2>EXHIBIT A — SUBHAULER&rsquo;S SUB-WORK</h2>
          <p>The Subhauler shall perform its portion of the Sub-Work on the Project as described below and in accordance with the Subcontract Documents, including all labor, materials, equipment, services, and other items required to complete such portion of the Sub-Work, except to the extent specifically indicated to be the responsibility of others. The Sub-Work of Subhauler, including any of its employees, sub-subhaulers, and sub-tier entities, is as follows:</p>
          <p>Subhauler shall transport freight (including, but not limited to, aggregate, soil, liquid, rock, construction material, non-hazardous and hazardous waste and materials, and/or anything that can be legally transported) to and from the Project and in accordance with this Subcontract.</p>
          <p>Prime Carrier shall notify Subhauler of material to be transported and of the time and location to load, all within a reasonable time prior to the required delivery time, and thereafter Subhauler will, without delay, cause said material to be transported to the place designated by Prime Carrier or its representative.</p>
          <p>The Subhauler acknowledges that certain asphalt products are perishable and that time is of the essence in making proper and timely delivery of all materials. Subhauler shall use all reasonable diligence to deliver such materials promptly, expeditiously, and safely to the proper locations and by the proper delivery dates and times as specified by Prime Carrier. Prime Carrier shall have no responsibility to engage Subhauler at all or for any minimum number of deliveries during the Term.</p>
          <p>BY SIGNING BELOW, PRIME CARRIER AND SUBHAULER AGREE TO THE SUBHAULER&rsquo;S SUB-WORK EXPRESSED HEREIN. SIGNED THIS ____________, 20____.</p>
        </div>

        {/* ── Exhibit B — General Terms ── */}
        <div className="page">
          <h2>EXHIBIT B — GENERAL TERMS AND CONDITIONS</h2>
          {[
            ["1. Statement of Sub-Work", "The term “Sub-Work” means the transport services provided by the Subhauler to and from the Project to fulfill the Subhauler’s obligations to Prime Carrier arising from this Subcontract and related to the Service Agreement between Prime Carrier and General Contractor for the benefit of Owner."],
            ["2. Clarifications & Descriptions", "Subhauler agrees that it is an independent contractor. Subhauler is solely responsible for, and has control over, all transportation means, methods, techniques, sequences, procedures, and coordination of the Sub-Work, and for the safety of its employees and sub-subhaulers. Prime Carrier shall have no control over Subhauler’s vehicles, employees, or sub-subhaulers. Subhauler agrees to employ capable and responsible personnel and to maintain its vehicles to efficiently perform the Sub-Work."],
            ["3. Time of Performance", "Time is of the essence. Subhauler will begin Sub-Work by the Date of Commencement, or, if none is designated, within two (2) days after being notified by Prime Carrier to proceed, and shall complete no later than the Substantial Completion Date."],
            ["4. Delay", "Subhauler will proceed promptly and diligently. If performance is delayed by acts or omissions of Owner, General Contractor, or Prime Carrier (excluding Subhauler), Subhauler may request an extension of time but shall not be entitled to any increase in price or to damages except to the extent Prime Carrier actually receives such monies from the Owner. No extension is valid without Prime Carrier’s written consent. Failure to timely complete may result in liquidated damages of $500.00/day."],
            ["5. Subcontract Sum", "The Subcontract Sum includes all taxes, duties, fees, and permits applicable to the Sub-Work, and all charges for freight, packing, loading, and unloading of materials and supplies."],
            ["6. Billing / Payment", "Prime Carrier will perform all billing and collecting and agrees to pay Subhauler an amount equal to the daily freight rate, less the commissions and fees in Section 7. Subhauler must deliver the bill of lading, hand tag, manifest, and/or weight certificate by email no later than the Sunday following the last day of Sub-Work performed for the Project."],
            ["7. Prime Carrier’s Commission / Administrative Fees", "Prime Carrier shall subtract a 10% (or other) commission fee based on project freight rates from each truck ticket. Tickets with incomplete or illegible information are subject to an additional 5% administration fee."],
            ["8. Condition Precedent to Payment", "Final payment shall not become due until: (A) approval and acceptance of the work by Owner, General Contractor, and Prime Carrier; (B) receipt of final payment from the General Contractor by Prime Carrier; and (C) satisfactory evidence that all labor and material accounts incurred by Subhauler have been paid in full. Subhauler expressly assumes the risk of non-payment by the General Contractor to Prime Carrier."],
            ["9. Modification", "Changes to the Sub-Work shall be made by written change order. If a change affects the Subcontract Sum or time of performance, it shall be equitably adjusted."],
            ["10. Warranties and Guarantees", "Subhauler warrants that its services conform to the terms of this Subcontract and applicable standards, and that it holds all necessary federal, state, county, or city certificates, permits, licenses, registrations, and insurance required to perform the Sub-Work. Subhauler shall never use Prime Carrier’s name or address on any truck registration document, and will immediately notify Prime Carrier if any permits lapse, are suspended, or revoked."],
            ["11. Insurance and Bond", "Subhauler shall maintain, at its own expense, without interruption: (a) Workers’ Compensation per applicable law plus a minimum $500,000 Employers Liability, with a waiver of subrogation in favor of Prime Carrier; (b) Commercial General Liability of not less than $1,000,000 per occurrence with a $1,000,000 general aggregate and $1,000,000 products/completed operations aggregate; and (c) Auto Vehicle Liability of not less than $1,000,000 (per person / per occurrence bodily injury / property damage) covering owned, hired, and non-owned vehicles. Prime Carrier shall be named as an additional insured. Insurers shall have a Best rating of not less than A-. Subhauler shall require its insurer to notify Prime Carrier thirty (30) days prior to cancellation or material change."],
            ["12. Indemnity and Duty to Defend", "Subhauler shall indemnify and hold harmless Owner, General Contractor, Prime Carrier, and their agents and employees from all claims, damages, losses, and expenses (including attorney’s fees) arising out of Subhauler’s performance, even if caused in part by their negligence, except claims caused by the sole negligence of Prime Carrier."],
            ["13. Dispute Resolution", "Prior to filing a lawsuit, the Parties agree to first attempt to resolve disputes through mediation in accordance with the accepted mediation rules of the State of Texas."],
            ["14. Consequential / Punitive Damages", "Neither Party shall be liable to the other for loss of profits, revenue, opportunity, goodwill, cost of capital, or for special, indirect, consequential, punitive, or exemplary damages."],
            ["15. Safety", "Subhauler shall take all reasonable safety precautions, comply with all safety measures initiated by Prime Carrier and applicable laws, and submit all incident reports to Prime Carrier within three (3) days."],
            ["16. Cleanup", "Subhauler shall keep the premises free from waste and debris caused by its personnel and shall leave its Sub-Work area clean. Prime Carrier may remove rubbish and deduct the cost from Subhauler’s payment."],
            ["17. Use of Prime Carrier’s Equipment", "If Subhauler uses Prime Carrier’s equipment, materials, or facilities, Subhauler shall reimburse Prime Carrier at a predetermined rate and assumes all related liabilities. Such use must be approved by Prime Carrier in writing."],
            ["18. Subhauler’s Default", "It shall be an Event of Default if Subhauler, among other things, abandons or fails to diligently prosecute the Sub-Work; fails to pay its employees, sub-subhaulers, or suppliers; fails to accelerate when required; declares bankruptcy/insolvency; or otherwise fails to perform under this Subcontract."],
            ["19. Remedies on Default", "On Default, Prime Carrier may withhold sums due; supplement labor/materials and deduct the cost; terminate and take possession of materials, tools, and equipment at the site; offset amounts due; and pursue any remedy at law or equity, after providing not less than two (2) working days’ written notice to cure."],
            ["20. Termination at Prime Carrier’s Convenience", "Prime Carrier may terminate the whole or part of this Subcontract for convenience. Subhauler’s sole remedy shall be payment for work properly performed, less prior payments, and Subhauler waives all claims for damages including lost or anticipated profits."],
            ["21. Miscellaneous Provisions", "Subhauler shall secure and pay for necessary permits; shall not assign or subcontract without written consent; bears all operating and maintenance expenses for its trucks (fuel, oil, supplies, maintenance, parts, taxes, fines); shall never use Prime Carrier’s name on truck registration; shall participate in a DOT-compliant drug and alcohol testing program and provide written proof; shall maintain a proper CB radio and a TWIC card; and shall provide an active wireless number able to receive text dispatch, responding to dispatch nightly by 6:00 pm."],
            ["22. Non-Compete / Confidentiality", "During the term, Subhauler shall not compete with Prime Carrier as to the Project and Sub-Work, and shall not disclose Prime Carrier’s trade secrets (including customer lists and pricing). Breach of non-compete may result in $500.00/day liquidated damages."],
            ["23. Non-Solicitation", "During the term and for sixty (60) days thereafter, Subhauler shall not hire away Prime Carrier’s employees or solicit its customers or business relationships."],
            ["24. Non-Disparagement", "Subhauler shall not make disparaging statements about Prime Carrier or its affiliates."],
            ["25. Licensing", "Subhauler shall obtain and maintain all licenses, certifications, permits, and registrations required by law; failure to maintain them is a material breach."],
            ["26. Governing Law", "This Subcontract shall be governed by the Laws of the State of Texas."],
            ["27. Attorney’s Fees", "If Subhauler defaults and Prime Carrier seeks to enforce this Subcontract, Subhauler agrees to pay Prime Carrier’s reasonable attorneys’ fees and expenses, whether or not suit is filed."],
            ["28. Interpretation", "These terms shall not be construed against either Party as drafter."],
            ["29. Severability", "If any part is invalid or unenforceable, the remainder shall remain valid and enforceable to the fullest extent permitted by law."],
            ["30. Entire Agreement", "This Subcontract, including all Subcontract Documents, represents the entire agreement between the Parties and supersedes any prior representations."],
          ].map(([h, b]) => (
            <p key={h} className="num"><strong>{h}.</strong> {b}</p>
          ))}
          <p style={{ marginTop: 14 }}><strong>ATTENTION: THIS DOCUMENT HAS IMPORTANT LEGAL CONSEQUENCES. CONSULTATION WITH AN ATTORNEY PRIOR TO EXECUTION IS ENCOURAGED.</strong></p>
          <p>SIGNED AND EXECUTED THIS ____________, 20____ (the &ldquo;Effective Date&rdquo;).</p>
          <div className="sigblock">
            <div className="sigrow"><strong>BY: PRIME CARRIER — Ronyx Logistics, LLC</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;______________________________ Printed Name&nbsp;&nbsp;&nbsp;Manager</div>
            <div className="sigrow"><strong>BY: SUBHAULER</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;______________________________ Printed Name&nbsp;&nbsp;&nbsp;Title ____________</div>
          </div>
        </div>

        {/* ── Exhibit C ── */}
        <div className="page">
          <h2>EXHIBIT C — SPECIFIC WORKING CONDITIONS AND RULES</h2>
          <p>Safety, consideration for others, and proper behavior while performing the Sub-Work are obligations of Prime Carrier to the General Contractor and Owner. The Subhauler, including its sub-tier entities, employees, and sub-subhaulers, will abide by the following:</p>
          <ul>
            <li>Drugs, alcohol, or weapons are not permitted at the Project site or while performing the Sub-Work. Any individual under the influence or possessing weapons will be immediately dismissed and removed.</li>
            <li>Required personal protective equipment must be used at all times while performing Sub-Work activities.</li>
            <li>All accidents and injuries of any type must be reported immediately to Prime Carrier.</li>
            <li>Safety rules and precautions must be abided by all individuals performing the Sub-Work; Subhauler is responsible for the safety of its own personnel.</li>
            <li>All individuals will deal with each other courteously; physical encounters, foul language, and verbal abuse are prohibited and cause for immediate dismissal.</li>
            <li>Subhauler shall operate and maintain its trucks in compliance with all applicable state and federal laws and shall perform daily pre-trip and post-trip inspections, ensuring no leaks or mechanical defects before beginning dispatch.</li>
            <li>Subhauler shall keep all haul loads free of contamination and is responsible for any load refused due to contamination.</li>
            <li>Subhauler shall use only environmentally safe release agents; the use of diesel as a release agent is strictly prohibited.</li>
          </ul>
          <p>BY SIGNING BELOW, PRIME CARRIER AND SUBHAULER AGREE TO THE SPECIFIC WORKING CONDITIONS AND RULES. SIGNED THIS ____________.</p>
          <div className="sigblock">
            <div className="sigrow"><strong>BY: PRIME CARRIER — Ronyx Logistics, LLC</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;______________________________ Printed Name&nbsp;&nbsp;&nbsp;Manager</div>
            <div className="sigrow"><strong>BY: SUBHAULER</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;______________________________ Printed Name&nbsp;&nbsp;&nbsp;Title ____________</div>
          </div>
        </div>

        {/* ── Supplementary forms ── */}
        <div className="page">
          <h2>TEXAS DWC FORM-85 — Independent Contractor Notice</h2>
          <p>Agreement between General Contractor (Ronyx Logistics, LLC) and Subcontractor to establish an independent relationship under the Texas Workers&rsquo; Compensation Act, Section 406.121. <em>Do not send this agreement to TDI-DWC.</em></p>
          <table><tbody>
            <tr><td>Term: FROM ____________ TO ____________</td><td>Estimated employees affected: ______</td></tr>
            <tr><td>General Contractor: Ronyx Logistics, LLC<br />Fed Tax ID: 93-3345170<br />3741 Graves, Groves, TX 77619</td><td>Subcontractor: ____________________<br />Fed Tax ID: ______________________<br />Address: __________________________</td></tr>
            <tr><td>Job sites: ☐ Blanket agreement — covers all job sites</td><td>Signature / Date: __________________</td></tr>
          </tbody></table>

          <h2>FORM W-9 — Request for Taxpayer Identification</h2>
          <p>Subhauler to complete and return an IRS Form W-9 (name, business name, federal tax classification, address, and TIN/EIN), with the requester listed as Ronyx Logistics, LLC, 3741 Graves Ave, Groves, Texas 77619.</p>
          <table><tbody>
            <tr><td>Name (as on tax return): __________________________</td></tr>
            <tr><td>Business name (if different): ______________________</td></tr>
            <tr><td>Tax classification: ☐ Individual/Sole proprietor ☐ C-Corp ☐ S-Corp ☐ Partnership ☐ LLC ☐ Other</td></tr>
            <tr><td>Address: __________________________  EIN / SSN: __________________</td></tr>
            <tr><td>Signature: ______________________________  Date: ____________</td></tr>
          </tbody></table>
        </div>

        <div className="page">
          <h2>ACH PAYMENT AUTHORIZATION</h2>
          <p>Ronyx Logistics, LLC offers ACH payments for your convenience, making secure electronic payments directly to your bank account. A processing fee will apply to each ACH transaction. Funds will be deposited the next business day after processing.</p>
          <p><strong>I agree to the ACH processing terms, including the processing fee of $14.99 per transaction.</strong></p>
          <p>Name: ______________________________  Signature: ______________________________  Date: ____________</p>

          <h2 style={{ marginTop: 28 }}>DIRECT DEPOSIT AUTHORIZATION</h2>
          <p>As a payment option, Ronyx Logistics, LLC offers payees electronic payment in lieu of check. Complete this form, attach a voided check, and return by email to ronyxlogistics@gmail.com.</p>
          <table><tbody>
            <tr><td>Payee Name: ____________________</td><td>Email: ____________________</td></tr>
            <tr><td>Address: ____________________</td><td>Phone: ____________________</td></tr>
            <tr><td>Financial Institution: ____________________</td><td>Institution Address: ____________________</td></tr>
            <tr><td>Routing Number: ____________________</td><td>Account Number: ____________________</td></tr>
            <tr><td>Account Type: ☐ Checking ☐ Savings</td><td>Verification: ☐ Voided check ☐ Bank letter</td></tr>
            <tr><td>Authorized Signature: ____________________</td><td>Printed Name / Title / Date: ____________________</td></tr>
          </tbody></table>
        </div>

        <div className="page">
          <div className="brand"><div className="name">RONYX</div><div className="sub">L O G I S T I C S&nbsp;&nbsp;L L C</div></div>
          <p style={{ textAlign: "center" }}>3741 Graves Ave, Groves, Texas 77619</p>
          <h2>TRUCK &amp; TRAILER LIST</h2>
          <p>Subhauler Name: ______________________  Contact Person: ______________________  Phone: ______________________</p>
          <p>List all trucks and trailers that may be utilized. Attach additional pages as necessary.</p>
          <table><tbody>
            <tr><th>Truck #</th><th>Type (truck/trailer/dump/belly)</th><th>Year/Make/Model</th><th>VIN #</th><th>License Plate &amp; State</th><th>License Exp. Date</th></tr>
            {Array.from({ length: 8 }).map((_, i) => <tr key={i}><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>)}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
