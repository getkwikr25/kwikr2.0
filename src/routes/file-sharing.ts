/**
 * File Sharing API Routes for Kwikr Platform
 * 
 * Provides secure file upload, download, and management endpoints
 * Integrates with messaging system and supports various file operations
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { FileSharingService, FileUploadData, FileSearchOptions, formatFileSize, getFileIcon } from '../services/file-sharing';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
};

const fileRoutes = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all file routes
fileRoutes.use('*', cors());

/**
 * Upload a single file
 * POST /api/files/upload
 */
fileRoutes.post('/upload', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    // Get user info from headers/auth (implement based on your auth system)
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Parse form data
    const body = await c.req.parseBody();
    const file = body.file as File;
    const conversationId = body.conversationId ? parseInt(body.conversationId as string) : undefined;
    const messageId = body.messageId ? parseInt(body.messageId as string) : undefined;
    const relatedEntityType = body.relatedEntityType as string || undefined;
    const relatedEntityId = body.relatedEntityId ? parseInt(body.relatedEntityId as string) : undefined;
    const isPublic = body.isPublic === 'true';
    const expiresAt = body.expiresAt as string || undefined;

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    const uploadData: FileUploadData = {
      file,
      originalName: file.name,
      mimeType: file.type,
      uploadedBy: userId,
      isPublic,
      expiresAt,
      conversationId,
      messageId,
      relatedEntityType,
      relatedEntityId: relatedEntityId
    };

    const result = await fileService.uploadFile(uploadData);

    if (result.success) {
      return c.json({
        success: true,
        file: result.file,
        fileId: result.fileId,
        message: 'File uploaded successfully'
      });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }

  } catch (error) {
    console.error('File upload error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during file upload' 
    }, 500);
  }
});

/**
 * Upload multiple files
 * POST /api/files/upload-multiple
 */
fileRoutes.post('/upload-multiple', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const body = await c.req.parseBody();
    const files = Object.values(body).filter(item => item instanceof File) as File[];
    const conversationId = body.conversationId ? parseInt(body.conversationId as string) : undefined;
    const messageId = body.messageId ? parseInt(body.messageId as string) : undefined;
    const relatedEntityType = body.relatedEntityType as string || undefined;
    const relatedEntityId = body.relatedEntityId ? parseInt(body.relatedEntityId as string) : undefined;
    const isPublic = body.isPublic === 'true';

    if (files.length === 0) {
      return c.json({ success: false, error: 'No files provided' }, 400);
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const uploadData: FileUploadData = {
          file,
          originalName: file.name,
          mimeType: file.type,
          uploadedBy: userId,
          isPublic,
          conversationId,
          messageId,
          relatedEntityType,
          relatedEntityId
        };

        const result = await fileService.uploadFile(uploadData);
        
        if (result.success) {
          results.push({ fileName: file.name, fileId: result.fileId, file: result.file });
        } else {
          errors.push({ fileName: file.name, error: result.error });
        }
      } catch (error) {
        errors.push({ 
          fileName: file.name, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });
      }
    }

    return c.json({
      success: errors.length === 0,
      uploaded: results,
      errors,
      totalFiles: files.length,
      successCount: results.length,
      errorCount: errors.length
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during multiple file upload' 
    }, 500);
  }
});

/**
 * Download a file
 * GET /api/files/:fileId/download
 */
fileRoutes.get('/:fileId/download', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const fileId = parseInt(c.req.param('fileId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';
    const inline = c.req.query('inline') === 'true';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const result = await fileService.downloadFile(fileId, {
      userId,
      userRole,
      trackDownload: true,
      inline
    });

    if (result.success && result.file && result.metadata) {
      const disposition = inline ? 'inline' : 'attachment';
      return new Response(result.file, {
        headers: {
          'Content-Type': result.metadata.mime_type,
          'Content-Length': result.metadata.file_size.toString(),
          'Content-Disposition': `${disposition}; filename="${result.metadata.original_name}"`,
          'Cache-Control': 'private, max-age=3600'
        }
      });
    } else {
      return c.json({ success: false, error: result.error }, 404);
    }

  } catch (error) {
    console.error('File download error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during file download' 
    }, 500);
  }
});

/**
 * Get file download URL (signed URL)
 * GET /api/files/:fileId/download-url
 */
fileRoutes.get('/:fileId/download-url', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const fileId = parseInt(c.req.param('fileId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';
    const expiresIn = parseInt(c.req.query('expires') || '3600'); // 1 hour default

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const result = await fileService.getFileDownloadUrl(fileId, userId, userRole, expiresIn);

    if (result.success) {
      return c.json({
        success: true,
        downloadUrl: result.url,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      });
    } else {
      return c.json({ success: false, error: result.error }, 404);
    }

  } catch (error) {
    console.error('Download URL generation error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error generating download URL' 
    }, 500);
  }
});

/**
 * Search and filter files
 * GET /api/files/search
 */
fileRoutes.get('/search', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Parse query parameters
    const searchOptions: FileSearchOptions = {
      userId,
      userRole,
      mimeTypes: c.req.query('mimeTypes')?.split(','),
      uploadedBy: c.req.query('uploadedBy') ? parseInt(c.req.query('uploadedBy')!) : undefined,
      conversationId: c.req.query('conversationId') ? parseInt(c.req.query('conversationId')!) : undefined,
      relatedEntityType: c.req.query('relatedEntityType'),
      relatedEntityId: c.req.query('relatedEntityId') ? parseInt(c.req.query('relatedEntityId')!) : undefined,
      isPublic: c.req.query('isPublic') ? c.req.query('isPublic') === 'true' : undefined,
      virusScanStatus: c.req.query('virusScanStatus'),
      processingStatus: c.req.query('processingStatus'),
      minFileSize: c.req.query('minFileSize') ? parseInt(c.req.query('minFileSize')!) : undefined,
      maxFileSize: c.req.query('maxFileSize') ? parseInt(c.req.query('maxFileSize')!) : undefined,
      uploadedAfter: c.req.query('uploadedAfter'),
      uploadedBefore: c.req.query('uploadedBefore'),
      search: c.req.query('search'),
      sortBy: c.req.query('sortBy') as any || 'created_at',
      sortOrder: c.req.query('sortOrder') as 'ASC' | 'DESC' || 'DESC',
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0
    };

    const result = await fileService.searchFiles(searchOptions);

    // Enhance files with display information
    const enhancedFiles = result.files.map(file => ({
      ...file,
      formattedSize: formatFileSize(file.file_size),
      fileIcon: getFileIcon(file.mime_type),
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: file.mime_type.startsWith('image/') ? `/api/files/${file.id}/download?inline=true` : null
    }));

    return c.json({
      success: true,
      files: enhancedFiles,
      total: result.total,
      hasMore: result.hasMore,
      pagination: {
        limit: searchOptions.limit,
        offset: searchOptions.offset,
        total: result.total
      }
    });

  } catch (error) {
    console.error('File search error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during file search' 
    }, 500);
  }
});

/**
 * Get file metadata
 * GET /api/files/:fileId
 */
fileRoutes.get('/:fileId', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const fileId = parseInt(c.req.param('fileId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Check view permission
    const stmt = c.env.DB.prepare(`
      SELECT f.*, u.name as uploader_name
      FROM file_metadata f
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE f.id = ?
    `);
    const file = await stmt.bind(fileId).first() as any;

    if (!file) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    // Check permissions (simplified - you may want to use the service method)
    const hasAccess = userRole === 'admin' || 
                      file.uploaded_by === userId || 
                      file.is_public === 1;

    if (!hasAccess) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const enhancedFile = {
      ...file,
      formattedSize: formatFileSize(file.file_size),
      fileIcon: getFileIcon(file.mime_type),
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: file.mime_type.startsWith('image/') ? `/api/files/${file.id}/download?inline=true` : null
    };

    return c.json({
      success: true,
      file: enhancedFile
    });

  } catch (error) {
    console.error('Get file metadata error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting file metadata' 
    }, 500);
  }
});

/**
 * Delete a file
 * DELETE /api/files/:fileId
 */
fileRoutes.delete('/:fileId', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const fileId = parseInt(c.req.param('fileId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const result = await fileService.deleteFile(fileId, userId, userRole);

    if (result.success) {
      return c.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      return c.json({ success: false, error: result.error }, 403);
    }

  } catch (error) {
    console.error('File deletion error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during file deletion' 
    }, 500);
  }
});

/**
 * Update file permissions
 * PUT /api/files/:fileId/permissions
 */
fileRoutes.put('/:fileId/permissions', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const fileId = parseInt(c.req.param('fileId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { permissions } = body;

    if (!permissions || !Array.isArray(permissions)) {
      return c.json({ success: false, error: 'Invalid permissions data' }, 400);
    }

    const result = await fileService.updateFilePermissions(fileId, userId, userRole, permissions);

    if (result.success) {
      return c.json({
        success: true,
        message: 'File permissions updated successfully'
      });
    } else {
      return c.json({ success: false, error: result.error }, 403);
    }

  } catch (error) {
    console.error('Permission update error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error updating permissions' 
    }, 500);
  }
});

/**
 * Get file statistics
 * GET /api/files/stats
 */
fileRoutes.get('/stats', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const stats = await fileService.getFileStatistics(userId, userRole);

    return c.json({
      success: true,
      stats: {
        ...stats,
        totalSizeFormatted: formatFileSize(stats.totalSize)
      }
    });

  } catch (error) {
    console.error('Get file stats error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting file statistics' 
    }, 500);
  }
});

/**
 * Bulk file operations
 * POST /api/files/bulk
 */
fileRoutes.post('/bulk', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { operation, fileIds, parameters } = body;

    if (!operation || !fileIds || !Array.isArray(fileIds)) {
      return c.json({ success: false, error: 'Invalid bulk operation data' }, 400);
    }

    const bulkOperation = {
      fileIds,
      operation,
      parameters
    };

    const result = await fileService.bulkFileOperation(bulkOperation, userId, userRole);

    return c.json({
      success: result.success,
      results: result.results,
      errors: result.errors,
      summary: {
        total: fileIds.length,
        successful: result.results.length,
        failed: result.errors.length
      }
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error during bulk operation' 
    }, 500);
  }
});

/**
 * Get files for a conversation
 * GET /api/files/conversation/:conversationId
 */
fileRoutes.get('/conversation/:conversationId', async (c) => {
  try {
    const { DB, R2 } = c.env;
    const fileService = new FileSharingService(DB, R2);

    const conversationId = parseInt(c.req.param('conversationId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const result = await fileService.searchFiles({
      userId,
      userRole,
      conversationId,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });

    const enhancedFiles = result.files.map(file => ({
      ...file,
      formattedSize: formatFileSize(file.file_size),
      fileIcon: getFileIcon(file.mime_type),
      downloadUrl: `/api/files/${file.id}/download`,
      previewUrl: file.mime_type.startsWith('image/') ? `/api/files/${file.id}/download?inline=true` : null
    }));

    return c.json({
      success: true,
      files: enhancedFiles,
      total: result.total
    });

  } catch (error) {
    console.error('Get conversation files error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting conversation files' 
    }, 500);
  }
});

export default fileRoutes;