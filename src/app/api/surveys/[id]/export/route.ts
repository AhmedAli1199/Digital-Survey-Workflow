import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { compositeWatermark } from '@/lib/server/watermark';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();

  // 1. Secure Auth Check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {} // Read-only in route handlers for auth check
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch Profile for Watermark Details
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, role')
    .eq('id', user.id)
    .single();

  const companyName = profile?.company_name || 'Unknown Company';

  // 3. Fetch Real Survey Data
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .single();

  if (surveyError || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  // 4. Fetch Real Assets
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('*')
    .eq('survey_id', id);

  if (assetsError) {
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }

  // 5. Generate PDF
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  
  // If no assets, create at least one page
  if (!assets || assets.length === 0) {
     const page = pdfDoc.addPage();
     page.drawText(`Survey Report: ${survey.site_name} (Empty)`, { x: 50, y: 700, size: 20 });
  }

  for (const asset of (assets || [])) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    // Header
    page.drawText(`Survey Report: ${survey.site_name}`, {
      x: 50,
      y: height - 50,
      size: 20,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Asset Tag: ${asset.asset_tag} (${asset.asset_type})`, {
      x: 50,
      y: height - 80,
      size: 14,
      font: timesRomanFont,
    });
    
    page.drawText(`Location: ${asset.location_area || 'N/A'} | Qty: ${asset.quantity}`, {
        x: 50,
        y: height - 100,
        size: 12,
        font: timesRomanFont,
        color: rgb(0.3, 0.3, 0.3)
    });

    // Process Image Securely
    try {
      // 4a. Resolve Asset Template Image from Storage
      // Pattern: "asset-diagrams/{asset_type}.png" (Sanitized)
      const sanitizedType = asset.asset_type.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const storagePath = `templates/${sanitizedType}.png`; 
      
      // 4b. Download Real Buffer from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('asset-diagrams') // Bucket Name
        .download(storagePath);

      if (downloadError) {
          throw new Error(`Storage download failed: ${downloadError.message}`);
      }

      const rawBuffer = Buffer.from(await fileData.arrayBuffer());
      
      // 4c. Apply Server-Side Watermark (Forensic Flattening)
      const watermarkedBuffer = await compositeWatermark(
        rawBuffer,
        user.id,
        companyName,
        survey.project_reference || 'REF-UNKNOWN'
      );

      // 4d. Embed in PDF
      const pdfImage = await pdfDoc.embedPng(watermarkedBuffer);
      const imgDims = pdfImage.scale(0.5);

      // Centered Image
      page.drawImage(pdfImage, {
        x: (width - imgDims.width) / 2,
        y: height - 500,
        width: imgDims.width,
        height: imgDims.height,
      });

    } catch (e: any) {
      console.error(`Asset Image Error (${asset.asset_tag}):`, e.message);
      
      // Fallback: Draw Error Box
      page.drawRectangle({
          x: 50, y: height - 400, width: 400, height: 200,
          borderColor: rgb(1, 0, 0), borderWidth: 2,
      });
      page.drawText('DIAGRAM UNAVAILABLE', {
        x: 70, y: height - 300, size: 20, color: rgb(1, 0, 0)
      });
      page.drawText(`(System could not load template for: ${asset.asset_type})`, {
        x: 70, y: height - 330, size: 10, color: rgb(0.5, 0, 0)
      });
    }
    
    // Footer Warning
    page.drawText(`TES PROPERTY - DO NOT DISTRIBUTE - DOWNLOADED BY ${user.email}`, {
      x: 50,
      y: 30,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // 5. Stream Response
  const pdfBytes = await pdfDoc.save();
  
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TES_Survey_${survey.project_reference}.pdf"`,
    },
  });
}
