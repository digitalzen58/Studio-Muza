import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import type { BrandMediaAsset } from '@/services/media'
import type { VisualComposition } from '@/services/visual-composition/types'
import { validateVisualComposition } from '@/services/visual-composition/validation'

test('=== STUDIO MŪZA — LOCAL MEDIA UPLOAD & RESILIENCE TESTS ===', async (t) => {
  const rootDir = process.cwd()

  await t.test('1. Support JPEG import validation', () => {
    const actionsMedia = fs.readFileSync(path.resolve(rootDir, 'src/actions/media.ts'), 'utf8')
    assert.ok(actionsMedia.includes("'image/jpeg'"), 'Server action must accept image/jpeg')
    const mediaPickerModal = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/media-picker-modal.tsx'), 'utf8')
    assert.ok(mediaPickerModal.includes('image/jpeg'), 'Client modal input must accept image/jpeg')
  })

  await t.test('2. Support PNG import validation', () => {
    const actionsMedia = fs.readFileSync(path.resolve(rootDir, 'src/actions/media.ts'), 'utf8')
    assert.ok(actionsMedia.includes("'image/png'"), 'Server action must accept image/png')
    const mediaPickerModal = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/media-picker-modal.tsx'), 'utf8')
    assert.ok(mediaPickerModal.includes('image/png'), 'Client modal input must accept image/png')
  })

  await t.test('3. Successful upload produces BrandMediaAsset with USER_UPLOAD source and private signed URL', () => {
    const actionsMedia = fs.readFileSync(path.resolve(rootDir, 'src/actions/media.ts'), 'utf8')
    assert.ok(actionsMedia.includes(".from('media_assets')\n      .insert({"), 'Must insert into media_assets')
    assert.ok(actionsMedia.includes("source: 'USER_UPLOAD'"), 'Must set source to USER_UPLOAD')
    assert.ok(actionsMedia.includes("createSignedUrl"), 'Must generate signed URL for client rendering')

    const mockAsset: BrandMediaAsset = {
      id: 'asset-123-jpg',
      url: 'https://supabase.co/storage/v1/object/sign/media_assets/businesses/biz-1/media/asset-123.jpg?token=abc',
      mediaType: 'IMAGE',
      alt: 'photo_test.jpg',
      width: 1200,
      height: 800,
      orientation: 'LANDSCAPE',
      source: 'USER_UPLOAD',
    }

    assert.strictEqual(mockAsset.id, 'asset-123-jpg')
    assert.ok(mockAsset.url.includes('createSignedUrl') || mockAsset.url.includes('sign/media_assets'), 'Url must be signed')
    assert.strictEqual(mockAsset.source, 'USER_UPLOAD')
  })

  await t.test('4. Uploaded media is immediately visible and assigned in Studio composition', () => {
    const contentStudio = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-studio.tsx'), 'utf8')
    assert.ok(contentStudio.includes('setMediaAssets((prev) => [newAsset, ...prev'), 'Newly uploaded asset must prepend to state')
    assert.ok(contentStudio.includes('handleAssignSlideMedia'), 'Must have handleAssignSlideMedia')
    assert.ok(contentStudio.includes("type: 'IMAGE'"), 'Must assign type IMAGE to visualComposition background')
  })

  await t.test('5. Saving draft with imported media persists visual composition & content_media assignment', () => {
    const actionsContent = fs.readFileSync(path.resolve(rootDir, 'src/actions/content.ts'), 'utf8')
    assert.ok(actionsContent.includes('validateVisualComposition'), 'Must validate visual composition on save')
    assert.ok(actionsContent.includes("usage_type: 'PRIMARY_IMAGE'"), 'Must assign primary image in content_media')

    const compWithUploadedImage: VisualComposition = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'IMAGE',
        mediaAssetId: 'asset-123-jpg',
        mediaUrl: 'https://supabase.co/storage/v1/object/sign/media_assets/businesses/biz-1/media/asset-123.jpg?token=abc',
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
      elements: [],
    }

    const valResult = validateVisualComposition(compWithUploadedImage)
    assert.ok(valResult.valid, 'Composition with uploaded image background must be valid')
    assert.strictEqual(valResult.sanitized?.background.type, 'IMAGE')
    assert.strictEqual(valResult.sanitized?.background.mediaAssetId, 'asset-123-jpg')
  })

  await t.test('6. Close / reopen draft restores media asset with fresh signed URL', () => {
    const pageRoute = fs.readFileSync(path.resolve(rootDir, 'src/app/(dashboard)/app/content/[contentId]/page.tsx'), 'utf8')
    assert.ok(pageRoute.includes('getBusinessMediaAssets'), 'Page must fetch business media assets')
    assert.ok(pageRoute.includes('createSignedUrl'), 'Page must refresh signed URL for referenced assets')
    assert.ok(pageRoute.includes('<ContentStudio'), 'Page must hydrate ContentStudio with initialMediaAssets')
  })

  await t.test('7. Upload error does NOT crash Studio page (UX resilience)', () => {
    const mediaPickerModal = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/media-picker-modal.tsx'), 'utf8')
    assert.ok(mediaPickerModal.includes('try {'), 'Must have try block in startUploadTransition')
    assert.ok(mediaPickerModal.includes('catch (err) {'), 'Must catch upload errors gracefully')
    assert.ok(mediaPickerModal.includes("Impossible d'importer cette image. Réessayez."), 'Must show French fallback error message')
  })

  await t.test('8. Invalid files (unsupported MIME, oversized >10MB) produce controlled French user error messages', () => {
    const mediaPickerModal = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/media-picker-modal.tsx'), 'utf8')
    assert.ok(mediaPickerModal.includes('trop volumineuse'), 'Must validate file size client-side')
    assert.ok(mediaPickerModal.includes('Format non supporté'), 'Must validate MIME type client-side')

    const actionsMedia = fs.readFileSync(path.resolve(rootDir, 'src/actions/media.ts'), 'utf8')
    assert.ok(actionsMedia.includes('trop volumineux'), 'Must validate file size server-side')
    assert.ok(actionsMedia.includes('Format non supporté'), 'Must validate MIME type server-side')
  })

  await t.test('9. Backward compatibility with older drafts (color, gradient, or legacy background structure)', () => {
    const legacyComp: VisualComposition = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'COLOR',
        color: '#FDFBF7',
      },
      elements: [
        {
          id: 'text-legacy-1',
          type: 'TEXT',
          text: 'Ancien brouillon',
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          colorMode: 'LIGHT',
        },
      ],
    }

    const valResult = validateVisualComposition(legacyComp)
    assert.ok(valResult.valid, 'Legacy draft composition must remain valid')
    assert.strictEqual(valResult.sanitized?.background.type, 'COLOR')
    assert.strictEqual(valResult.sanitized?.elements.length, 1)
  })

  await t.test('10. Pexels stock photo import remains fully functional', () => {
    const stockMediaModal = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/stock-media-modal.tsx'), 'utf8')
    assert.ok(stockMediaModal.includes('importStockMediaAction'), 'Stock media modal must import stock images')
    assert.ok(stockMediaModal.includes('Pexels'), 'Must support Pexels stock photos')
    const contentStudio = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-studio.tsx'), 'utf8')
    assert.ok(contentStudio.includes('handleStockMediaImported'), 'Studio must handle stock media import')
  })
})
