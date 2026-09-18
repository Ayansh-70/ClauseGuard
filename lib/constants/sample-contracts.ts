/**
 * Sample Contracts for 1-Click Evaluation and Demonstration
 * Provides realistic agreements with real legal provisions.
 */

export interface SampleContract {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
}

export const SAMPLE_CONSULTING_AGREEMENT: SampleContract = {
  id: 'consulting-agreement',
  name: 'Master Consulting Agreement.txt',
  category: 'Commercial Services',
  description: 'Unilateral indemnification, Net-90 payment terms, uncapped contractor liability.',
  content: `MASTER CONSULTING SERVICES AGREEMENT

This Master Consulting Services Agreement ("Agreement") is entered into as of October 1, 2026, by and between Nexus Corporation, a Delaware corporation ("Client"), and Apex Advisory Group LLC ("Consultant").

1. SCOPE OF SERVICES
Consultant shall perform the technology advisory and strategic implementation services set forth in Statements of Work issued under this Agreement. Consultant shall devote commercially reasonable efforts to fulfill deliverables.

2. FEES AND PAYMENT TERMS
Client shall compensate Consultant in accordance with the fee schedule specified in each SOW. Client shall remit payment for undisputed invoice amounts within ninety (90) calendar days following receipt of Consultant's written invoice. Consultant shall not assess interest, penalties, or late charges on delayed disbursements.

3. INDEMNIFICATION AND DEFENSE
Consultant agrees to defend, indemnify, and hold harmless Client, its parent companies, affiliates, directors, officers, employees, and agents from and against any and all third-party claims, demands, liabilities, damages, judgments, settlements, costs, and expenses (including reasonable attorneys' fees and litigation expenses) arising out of or resulting from Consultant's performance of services, any alleged breach of warranty, or any infringement of third-party intellectual property rights. This indemnification obligation shall be unilateral and is not subject to any monetary limitation or liability cap.

4. LIMITATION OF LIABILITY
In no event shall Client be liable to Consultant for any indirect, incidental, special, consequential, or punitive damages, or for any lost profits or revenues. Client's total aggregate liability arising out of or related to this Agreement shall be strictly capped at the fees actually paid to Consultant in the thirty (30) days preceding the claim.

5. INTELLECTUAL PROPERTY OWNERSHIP
Consultant hereby assigns to Client all right, title, and interest in and to all deliverables, inventions, works of authorship, and proprietary developments created, conceived, or reduced to practice during the term of this Agreement. Consultant retains no residual licensing rights.

6. TERM AND TERMINATION
This Agreement shall commence on the Effective Date and continue for a period of two (2) years. Client may terminate this Agreement or any SOW for convenience at any time upon five (5) business days' prior written notice to Consultant. Consultant may only terminate for an uncured material breach upon sixty (60) days' prior written notice.

7. GOVERNING LAW AND DISPUTE RESOLUTION
This Agreement shall be construed and governed in accordance with the laws of the State of New York, without regard to conflicts of law principles. Any dispute arising hereunder shall be resolved exclusively in the state and federal courts located in New York County, New York.`,
};

export const SAMPLE_MUTUAL_NDA: SampleContract = {
  id: 'mutual-nda',
  name: 'Standard Mutual Non-Disclosure Agreement.txt',
  category: 'Confidentiality',
  description: 'Perpetual confidentiality, 2-year non-solicitation, injunctive relief.',
  content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is effective as of November 15, 2026, by and between Meridian Systems Inc. ("Party A") and Horizon Technologies LLC ("Party B").

1. PURPOSE
The parties wish to explore a potential strategic commercial partnership and in connection therewith may disclose proprietary business, technical, and financial information.

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means all non-public information disclosed by either party, whether orally or in writing, designated as confidential or which reasonably should be understood to be confidential given the nature of the information.

3. CONFIDENTIALITY OBLIGATIONS
Each party agrees to hold the other party's Confidential Information in strict confidence, exercising at least the degree of care it uses for its own sensitive assets, but not less than reasonable care. Confidential Information shall not be disclosed to any third party without prior written authorization.

4. DURATION OF OBLIGATIONS
The confidentiality obligations under this Agreement shall survive termination and remain in effect perpetually with respect to all disclosed trade secrets, and for a period of five (5) years following termination with respect to all other Confidential Information.

5. NON-SOLICITATION
During the term of this Agreement and for a period of twenty-four (24) months following termination, neither party shall directly or indirectly solicit, recruit, or attempt to induce any employee or contractor of the other party to terminate their employment.

6. INJUNCTIVE RELIEF
The parties acknowledge that an unauthorized disclosure of Confidential Information may cause irreparable harm for which monetary damages alone would be inadequate. The disclosing party shall be entitled to seek immediate injunctive relief without the requirement of posting a bond.

7. GOVERNING LAW
This Agreement shall be governed by and interpreted under the laws of the State of California.`,
};

export const SAMPLE_CONTRACTS: SampleContract[] = [
  SAMPLE_CONSULTING_AGREEMENT,
  SAMPLE_MUTUAL_NDA,
];
