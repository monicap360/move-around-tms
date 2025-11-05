// Generate Branded Driver Onboarding Templates
// Creates professional PDF forms for driver onboarding with Ronyx Logistics LLC branding

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const templateType = searchParams.get('template') || 'application';

  try {
    let pdfBytes;
    
    switch (templateType) {
      case 'application':
        pdfBytes = await generateDriverApplicationForm();
        break;
      case 'emergency-contact':
        pdfBytes = await generateEmergencyContactForm();
        break;
      case 'direct-deposit':
        pdfBytes = await generateDirectDepositForm();
        break;
      case 'equipment-checklist':
        pdfBytes = await generateEquipmentChecklistForm();
        break;
      case 'safety-acknowledgment':
        pdfBytes = await generateSafetyAcknowledgmentForm();
        break;
      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const filename = `ronyx-logistics-${templateType}-form.pdf`;
    
    return new NextResponse(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Template generation failed' }, { status: 500 });
  }
}

async function generateDriverApplicationForm(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandBlue = rgb(0.04, 0.24, 0.57);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const black = rgb(0, 0, 0);

  let yPos = height - 40;

  // Header with company branding
  page.drawRectangle({
    x: 0,
    y: yPos - 10,
    width: width,
    height: 80,
    color: brandBlue,
  });

  page.drawText('RONYX LOGISTICS LLC', {
    x: 50,
    y: yPos + 40,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Professional Aggregate Hauling Services', {
    x: 50,
    y: yPos + 20,
    size: 10,
    font: font,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText('3741 Graves Ave, Groves, Texas 77619', {
    x: 50,
    y: yPos + 5,
    size: 9,
    font: font,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText('DRIVER APPLICATION', {
    x: width - 220,
    y: yPos + 30,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  yPos -= 120;

  // Form title and instructions
  page.drawText('COMMERCIAL DRIVER APPLICATION FORM', {
    x: 50,
    y: yPos,
    size: 14,
    font: fontBold,
    color: black,
  });

  yPos -= 20;

  page.drawText('Please complete all sections. Print clearly in blue or black ink.', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: gray,
  });

  yPos -= 30;

  // Personal Information Section
  drawSectionHeader(page, 'PERSONAL INFORMATION', yPos, fontBold, brandBlue);
  yPos -= 25;

  const fields = [
    ['Full Legal Name:', '________________________________', 'Date of Birth:', '___________'],
    ['Social Security Number:', '____-____-____', 'Phone Number:', '(___)____-____'],
    ['Current Address:', '________________________________________________________________________'],
    ['City:', '________________________', 'State:', '_____', 'ZIP Code:', '__________'],
    ['Email Address:', '_______________________________________________________________'],
    ['How long at current address?:', '____________', 'Previous Address (if less than 2 years):'],
    ['_________________________________________________________________________'],
  ];

  for (const fieldRow of fields) {
    if (fieldRow.length === 4) {
      // Two field row
      page.drawText(fieldRow[0], { x: 50, y: yPos, size: 9, font: font, color: black });
      page.drawText(fieldRow[1], { x: 180, y: yPos, size: 9, font: font, color: gray });
      page.drawText(fieldRow[2], { x: 320, y: yPos, size: 9, font: font, color: black });
      page.drawText(fieldRow[3], { x: 430, y: yPos, size: 9, font: font, color: gray });
    } else if (fieldRow.length === 2) {
      // Single field row
      page.drawText(fieldRow[0], { x: 50, y: yPos, size: 9, font: font, color: black });
      page.drawText(fieldRow[1], { x: 200, y: yPos, size: 9, font: font, color: gray });
    } else {
      // Full width field
      page.drawText(fieldRow[0], { x: 50, y: yPos, size: 9, font: font, color: gray });
    }
    yPos -= 15;
  }

  yPos -= 10;

  // Employment History Section
  drawSectionHeader(page, 'EMPLOYMENT HISTORY (Last 3 Years)', yPos, fontBold, brandBlue);
  yPos -= 25;

  const employmentFields = [
    'Current/Most Recent Employer:',
    'Company Name: ________________________________  Phone: (___)____-____',
    'Address: ___________________________________________________________________',
    'Supervisor Name: _________________________  Position Held: ________________',
    'Employment Dates: From _________ To _________  Salary/Hourly Rate: __________',
    'Reason for Leaving: ________________________________________________________',
    '',
    'Previous Employer:',
    'Company Name: ________________________________  Phone: (___)____-____',
    'Address: ___________________________________________________________________',
    'Supervisor Name: _________________________  Position Held: ________________',
    'Employment Dates: From _________ To _________  Salary/Hourly Rate: __________',
    'Reason for Leaving: ________________________________________________________',
  ];

  for (const field of employmentFields) {
    if (field === '') {
      yPos -= 10;
    } else {
      page.drawText(field, { x: 50, y: yPos, size: 9, font: font, color: field.includes(':') ? black : gray });
      yPos -= 12;
    }
  }

  // Add second page if needed
  const page2 = pdfDoc.addPage([612, 792]);
  let yPos2 = height - 60;

  // Driving Record Section
  drawSectionHeader(page2, 'DRIVING RECORD & CERTIFICATIONS', yPos2, fontBold, brandBlue);
  yPos2 -= 25;

  const drivingFields = [
    'CDL Number: ___________________  Class: _______  Expiration Date: ___________',
    'Endorsements: H ___ N ___ P ___ S ___ T ___ X ___ Other: ________________',
    'State Issued: ___________  Years of Commercial Driving Experience: _________',
    '',
    'DOT Medical Certificate Expiration: ___________  TWIC Card: Yes ___ No ___',
    'Have you ever been convicted of a traffic violation? Yes ___ No ___',
    'If yes, explain: __________________________________________________________',
    '',
    'Have you ever had your license suspended or revoked? Yes ___ No ___',
    'If yes, explain: __________________________________________________________',
  ];

  for (const field of drivingFields) {
    if (field === '') {
      yPos2 -= 10;
    } else {
      page2.drawText(field, { x: 50, y: yPos2, size: 9, font: font, color: black });
      yPos2 -= 15;
    }
  }

  yPos2 -= 10;

  // References Section
  drawSectionHeader(page2, 'REFERENCES (Non-Family)', yPos2, fontBold, brandBlue);
  yPos2 -= 25;

  const referenceFields = [
    'Reference 1:',
    'Name: _________________________  Phone: (___)____-____',
    'Relationship: ___________________  Years Known: __________',
    '',
    'Reference 2:',
    'Name: _________________________  Phone: (___)____-____',
    'Relationship: ___________________  Years Known: __________',
  ];

  for (const field of referenceFields) {
    if (field === '') {
      yPos2 -= 10;
    } else {
      page2.drawText(field, { x: 50, y: yPos2, size: 9, font: font, color: field.includes(':') && !field.includes('Name:') ? black : gray });
      yPos2 -= 15;
    }
  }

  // Signature Section
  yPos2 -= 20;
  page2.drawText('APPLICANT CERTIFICATION AND SIGNATURE', {
    x: 50,
    y: yPos2,
    size: 12,
    font: fontBold,
    color: black,
  });

  yPos2 -= 20;
  const certText = [
    'I certify that all information provided in this application is true and complete. I understand',
    'that any false information may lead to dismissal. I authorize investigation of all statements',
    'contained in this application and authorize former employers to give any information they',
    'may have regarding my employment record.',
  ];

  for (const line of certText) {
    page2.drawText(line, { x: 50, y: yPos2, size: 9, font: font, color: black });
    yPos2 -= 12;
  }

  yPos2 -= 20;
  page2.drawText('Applicant Signature: ____________________________  Date: ______________', {
    x: 50,
    y: yPos2,
    size: 10,
    font: font,
    color: black,
  });

  // Footer with company info
  page2.drawText('© 2025 Ronyx Logistics LLC • Equal Opportunity Employer', {
    x: 50,
    y: 30,
    size: 8,
    font: font,
    color: gray,
  });

  return pdfDoc.save();
}

async function generateEmergencyContactForm(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandBlue = rgb(0.04, 0.24, 0.57);
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  let yPos = height - 40;

  // Header
  addCompanyHeader(page, yPos, fontBold, font, brandBlue, 'EMERGENCY CONTACT FORM');
  yPos -= 120;

  // Form content
  page.drawText('EMERGENCY CONTACT INFORMATION', {
    x: 50,
    y: yPos,
    size: 14,
    font: fontBold,
    color: black,
  });

  yPos -= 30;

  page.drawText('Employee Name: _______________________________________________________________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  yPos -= 40;

  drawSectionHeader(page, 'PRIMARY EMERGENCY CONTACT', yPos, fontBold, brandBlue);
  yPos -= 25;

  const primaryFields = [
    'Full Name: ________________________________________________________________',
    'Relationship: ______________________________________________________________',
    'Primary Phone: (___)____-____  Secondary Phone: (___)____-____',
    'Address: __________________________________________________________________',
    'City: ________________________  State: _____  ZIP Code: __________',
    'Email: ____________________________________________________________________',
  ];

  for (const field of primaryFields) {
    page.drawText(field, { x: 50, y: yPos, size: 10, font: font, color: black });
    yPos -= 20;
  }

  yPos -= 20;

  drawSectionHeader(page, 'SECONDARY EMERGENCY CONTACT', yPos, fontBold, brandBlue);
  yPos -= 25;

  const secondaryFields = [
    'Full Name: ________________________________________________________________',
    'Relationship: ______________________________________________________________',
    'Primary Phone: (___)____-____  Secondary Phone: (___)____-____',
    'Address: __________________________________________________________________',
    'City: ________________________  State: _____  ZIP Code: __________',
    'Email: ____________________________________________________________________',
  ];

  for (const field of secondaryFields) {
    page.drawText(field, { x: 50, y: yPos, size: 10, font: font, color: black });
    yPos -= 20;
  }

  yPos -= 40;

  // Medical Information
  drawSectionHeader(page, 'MEDICAL INFORMATION', yPos, fontBold, brandBlue);
  yPos -= 25;

  const medicalFields = [
    'Do you have any medical conditions we should be aware of? Yes ___ No ___',
    'If yes, please describe: ___________________________________________________',
    '_____________________________________________________________________',
    'List any medications you take regularly: ___________________________________',
    '_____________________________________________________________________',
    'Allergies: ________________________________________________________________',
    'Preferred Hospital: ________________________________________________________',
    'Doctor Name: ___________________________  Phone: (___)____-____',
  ];

  for (const field of medicalFields) {
    page.drawText(field, { x: 50, y: yPos, size: 10, font: font, color: black });
    yPos -= 18;
  }

  // Signature
  yPos -= 30;
  page.drawText('Employee Signature: ____________________________  Date: ______________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  // Footer
  page.drawText('© 2025 Ronyx Logistics LLC • Confidential Information', {
    x: 50,
    y: 30,
    size: 8,
    font: font,
    color: gray,
  });

  return pdfDoc.save();
}

async function generateDirectDepositForm(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandBlue = rgb(0.04, 0.24, 0.57);
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  let yPos = height - 40;

  // Header
  addCompanyHeader(page, yPos, fontBold, font, brandBlue, 'DIRECT DEPOSIT AUTHORIZATION');
  yPos -= 120;

  // Form content
  page.drawText('PAYROLL DIRECT DEPOSIT FORM', {
    x: 50,
    y: yPos,
    size: 14,
    font: fontBold,
    color: black,
  });

  yPos -= 40;

  const depositFields = [
    'Employee Name: _______________________________________________________________',
    'Employee ID: ________________  Social Security Number: ____-____-____',
    '',
    'I authorize Ronyx Logistics LLC to deposit my payroll directly into my account(s):',
    '',
    'Bank Name: ________________________________________________________________',
    'Bank Address: _____________________________________________________________',
    'City: ________________________  State: _____  ZIP Code: __________',
    '',
    'Account Type:    ___ Checking    ___ Savings',
    'Routing Number: ___________________  Account Number: _____________________',
    '',
    'Deposit Distribution:',
    '    ___ Full Amount to above account',
    '    ___ Percentage: _____%  Amount: $_______  to above account',
    '',
    'Secondary Account (if applicable):',
    'Bank Name: ________________________________________________________________',
    'Account Type:    ___ Checking    ___ Savings',
    'Routing Number: ___________________  Account Number: _____________________',
    'Deposit Amount/Percentage: ____________________________________________',
  ];

  for (const field of depositFields) {
    if (field === '') {
      yPos -= 15;
    } else {
      page.drawText(field, { x: 50, y: yPos, size: 10, font: font, color: black });
      yPos -= 18;
    }
  }

  yPos -= 20;

  // Authorization text
  const authText = [
    'AUTHORIZATION:',
    'This authorization will remain in effect until I notify Ronyx Logistics LLC in writing',
    'to cancel it. I understand that it may take up to two pay periods to process changes.',
    'I agree that if an erroneous deposit is made to my account, Ronyx Logistics LLC may',
    'debit my account to correct the error.',
  ];

  for (const line of authText) {
    const textFont = line === 'AUTHORIZATION:' ? fontBold : font;
    page.drawText(line, { x: 50, y: yPos, size: 10, font: textFont, color: black });
    yPos -= 15;
  }

  yPos -= 30;

  page.drawText('Employee Signature: ____________________________  Date: ______________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  yPos -= 20;

  page.drawText('Please attach a voided check or deposit slip for verification.', {
    x: 50,
    y: yPos,
    size: 9,
    font: font,
    color: gray,
  });

  return pdfDoc.save();
}

async function generateEquipmentChecklistForm(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandBlue = rgb(0.04, 0.24, 0.57);
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  let yPos = height - 40;

  // Header
  addCompanyHeader(page, yPos, fontBold, font, brandBlue, 'EQUIPMENT CHECKLIST');
  yPos -= 120;

  page.drawText('DRIVER EQUIPMENT ASSIGNMENT & CHECKLIST', {
    x: 50,
    y: yPos,
    size: 14,
    font: fontBold,
    color: black,
  });

  yPos -= 40;

  const equipmentItems = [
    ['Truck Number:', '____________', 'Trailer Number:', '____________'],
    ['Assigned Date:', '____________', 'Odometer Reading:', '____________'],
    '',
    'EQUIPMENT CHECKLIST - Check all items received:',
    '',
    '___ Truck Keys (Quantity: ___)     ___ Fuel Card',
    '___ EZ-Pass/Toll Transponder      ___ Company Cell Phone',
    '___ GPS/Navigation Device         ___ Safety Equipment Kit',
    '___ Load Straps/Chains           ___ Emergency Kit',
    '___ Tarps (Quantity: ___)         ___ Fire Extinguisher',
    '___ Bungee Cords                 ___ First Aid Kit',
    '___ Flashlight                   ___ Reflective Triangles',
    '___ Tool Kit                     ___ Log Books',
    '___ Company Uniform/Shirts       ___ Safety Vest',
    '___ Hard Hat                     ___ Safety Glasses',
    '',
    'TRUCK CONDITION NOTES:',
    '_____________________________________________________________________',
    '_____________________________________________________________________',
    '_____________________________________________________________________',
    '',
    'DRIVER RESPONSIBILITIES:',
    'I acknowledge receipt of the above equipment and agree to:',
    '• Maintain equipment in good working condition',
    '• Report any damage or maintenance issues immediately',
    '• Return all equipment upon termination of employment',
    '• Be responsible for loss or damage due to negligence',
  ];

  for (const item of equipmentItems) {
    if (Array.isArray(item)) {
      page.drawText(item[0], { x: 50, y: yPos, size: 10, font: font, color: black });
      page.drawText(item[1], { x: 150, y: yPos, size: 10, font: font, color: gray });
      page.drawText(item[2], { x: 280, y: yPos, size: 10, font: font, color: black });
      page.drawText(item[3], { x: 380, y: yPos, size: 10, font: font, color: gray });
    } else if (item === '') {
      yPos -= 10;
      continue;
    } else {
      const textFont = item.includes('CHECKLIST') || item.includes('CONDITION') || item.includes('RESPONSIBILITIES') ? fontBold : font;
      page.drawText(item, { x: 50, y: yPos, size: 10, font: textFont, color: black });
    }
    yPos -= 15;
  }

  yPos -= 20;

  page.drawText('Driver Signature: _____________________________  Date: ______________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  yPos -= 20;

  page.drawText('Supervisor Signature: ________________________  Date: ______________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  return pdfDoc.save();
}

async function generateSafetyAcknowledgmentForm(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandBlue = rgb(0.04, 0.24, 0.57);
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);

  let yPos = height - 40;

  // Header
  addCompanyHeader(page, yPos, fontBold, font, brandBlue, 'SAFETY ACKNOWLEDGMENT');
  yPos -= 120;

  page.drawText('DRIVER SAFETY POLICY ACKNOWLEDGMENT', {
    x: 50,
    y: yPos,
    size: 14,
    font: fontBold,
    color: black,
  });

  yPos -= 30;

  page.drawText('Employee Name: _______________________________________________________________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  yPos -= 40;

  const safetyPolicies = [
    'I acknowledge that I have received, read, and understand the following safety policies:',
    '',
    '___ DOT Hours of Service Regulations',
    '___ Vehicle Inspection Procedures (DVIR)',
    '___ Hazardous Materials Handling',
    '___ Accident Reporting Procedures',
    '___ Drug and Alcohol Policy',
    '___ Cell Phone/Electronic Device Policy',
    '___ Seatbelt and Safety Equipment Usage',
    '___ Defensive Driving Techniques',
    '___ Cargo Securement Requirements',
    '___ Weather and Road Condition Protocols',
    '',
    'SAFETY COMMITMENTS:',
    'I commit to the following safety practices:',
    '',
    '• Conduct pre-trip and post-trip vehicle inspections',
    '• Follow all DOT regulations and company policies',
    '• Report all accidents, incidents, and violations immediately',
    '• Maintain valid CDL and medical certification',
    '• Never operate a vehicle under the influence of drugs or alcohol',
    '• Always wear appropriate safety equipment',
    '• Secure all loads according to DOT standards',
    '• Maintain professional conduct and appearance',
    '',
    'I understand that violation of safety policies may result in disciplinary action',
    'up to and including termination of employment.',
  ];

  for (const policy of safetyPolicies) {
    if (policy === '') {
      yPos -= 10;
    } else {
      const textFont = policy.includes('COMMITMENTS') ? fontBold : font;
      page.drawText(policy, { x: 50, y: yPos, size: 9, font: textFont, color: black });
      yPos -= 12;
    }
  }

  yPos -= 20;

  page.drawText('Driver Signature: _____________________________  Date: ______________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  yPos -= 20;

  page.drawText('Witness Signature: ____________________________  Date: ______________', {
    x: 50,
    y: yPos,
    size: 10,
    font: font,
    color: black,
  });

  return pdfDoc.save();
}

// Helper functions
function drawSectionHeader(page: any, title: string, yPos: number, fontBold: any, color: any) {
  page.drawRectangle({
    x: 40,
    y: yPos - 5,
    width: 532,
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  page.drawText(title, {
    x: 50,
    y: yPos,
    size: 11,
    font: fontBold,
    color: color,
  });
}

function addCompanyHeader(page: any, yPos: number, fontBold: any, font: any, brandBlue: any, formTitle: string) {
  page.drawRectangle({
    x: 0,
    y: yPos - 10,
    width: 612,
    height: 80,
    color: brandBlue,
  });

  page.drawText('RONYX LOGISTICS LLC', {
    x: 50,
    y: yPos + 40,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Professional Aggregate Hauling Services', {
    x: 50,
    y: yPos + 20,
    size: 9,
    font: font,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText('3741 Graves Ave, Groves, Texas 77619', {
    x: 50,
    y: yPos + 5,
    size: 9,
    font: font,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText(formTitle, {
    x: 300,
    y: yPos + 30,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
}