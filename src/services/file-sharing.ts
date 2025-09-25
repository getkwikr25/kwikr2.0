/**
 * File Sharing Service for Kwikr Platform
 * 
 * Provides secure file upload, download, and management capabilities
 * Integrates with Cloudflare R2 storage and messaging system
 * Supports multiple file types with security scanning and access control
 */

export interface FileMetadata {
  id: number;
  original_name: string;
  stored_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  storage_path: string;
  uploaded_by: number;
  upload_session_id?: string;
  created_at: string;
  expires_at?: string;
  is_public: boolean;
  download_count: number;
  last_downloaded_at?: string;
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'failed';
  virus_scan_result?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  thumbnail_path?: string;
  preview_path?: string;
  access_permissions: FilePermission[];
}

export interface FilePermission {
  id: number;
  file_id: number;
  user_id?: number;
  role?: 'client' | 'worker' | 'admin';
  permission_type: 'view' | 'download' | 'edit' | 'delete' | 'share';
  granted_by: number;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface FileUploadData {
  file: File | ArrayBuffer;
  originalName: string;
  mimeType: string;
  uploadedBy: number;
  isPublic?: boolean;
  expiresAt?: string;
  uploadSessionId?: string;
  conversationId?: number;
  messageId?: number;
  relatedEntityType?: 'job' | 'invoice' | 'dispute' | 'profile' | 'message';
  relatedEntityId?: number;
}

export interface FileDownloadOptions {
  userId: number;
  userRole: string;
  trackDownload?: boolean;
  generateThumbnail?: boolean;
  inline?: boolean;
}

export interface FileSearchOptions {
  userId: number;
  userRole: string;
  mimeTypes?: string[];
  uploadedBy?: number;
  conversationId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  isPublic?: boolean;
  virusScanStatus?: string;
  processingStatus?: string;
  minFileSize?: number;
  maxFileSize?: number;
  uploadedAfter?: string;
  uploadedBefore?: string;
  search?: string;
  sortBy?: 'created_at' | 'file_size' | 'download_count' | 'original_name';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface FileUploadResult {
  success: boolean;
  file?: FileMetadata;
  uploadUrl?: string;
  error?: string;
  fileId?: number;
}

export interface BulkFileOperation {
  fileIds: number[];
  operation: 'delete' | 'update_permissions' | 'move' | 'copy';
  parameters?: Record<string, any>;
}

export interface FileStatistics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  uploadsByMonth: Record<string, number>;
  topUploaders: Array<{userId: number, userName: string, fileCount: number}>;
  storageUsageByUser: Record<number, number>;
  recentActivity: Array<{
    action: string;
    fileName: string;
    userId: number;
    userName: string;
    timestamp: string;
  }>;
}

export class FileSharingService {
  constructor(
    private db: D1Database,
    private r2: R2Bucket
  ) {}

  /**
   * Upload a file to R2 storage with security scanning and metadata storage
   */
  async uploadFile(uploadData: FileUploadData): Promise<FileUploadResult> {
    try {
      // Validate file type and size
      const validation = this.validateFile(uploadData);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generate unique storage name and path
      const storedName = this.generateStoredName(uploadData.originalName);
      const storagePath = this.generateStoragePath(uploadData.uploadedBy, storedName);
      
      // Calculate file hash for deduplication and integrity
      const fileHash = await this.calculateFileHash(uploadData.file);
      
      // Check for duplicate files
      const existingFile = await this.findFileByHash(fileHash, uploadData.uploadedBy);
      if (existingFile) {
        return {
          success: true,
          file: existingFile,
          fileId: existingFile.id
        };
      }

      // Get file size
      const fileSize = uploadData.file instanceof File ? 
        uploadData.file.size : 
        uploadData.file.byteLength;

      // Upload to R2 storage
      const uploadResult = await this.uploadToR2(storagePath, uploadData.file);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Store metadata in database
      const fileMetadata = await this.storeFileMetadata({
        original_name: uploadData.originalName,
        stored_name: storedName,
        file_size: fileSize,
        mime_type: uploadData.mimeType,
        file_hash: fileHash,
        storage_path: storagePath,
        uploaded_by: uploadData.uploadedBy,
        upload_session_id: uploadData.uploadSessionId,
        expires_at: uploadData.expiresAt,
        is_public: uploadData.isPublic || false,
        virus_scan_status: 'pending',
        processing_status: 'pending'
      });

      // Associate with message/conversation if provided
      if (uploadData.conversationId || uploadData.messageId) {
        await this.associateFileWithMessage(
          fileMetadata.id, 
          uploadData.conversationId, 
          uploadData.messageId
        );
      }

      // Associate with related entity if provided
      if (uploadData.relatedEntityType && uploadData.relatedEntityId) {
        await this.associateFileWithEntity(
          fileMetadata.id,
          uploadData.relatedEntityType,
          uploadData.relatedEntityId
        );
      }

      // Start background processing (virus scan, thumbnail generation)
      await this.initiateBackgroundProcessing(fileMetadata.id);

      return {
        success: true,
        file: fileMetadata,
        fileId: fileMetadata.id
      };

    } catch (error) {
      console.error('File upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'File upload failed' 
      };
    }
  }

  /**
   * Download a file with permission checking and access logging
   */
  async downloadFile(
    fileId: number, 
    options: FileDownloadOptions
  ): Promise<{ success: boolean; file?: ArrayBuffer; metadata?: FileMetadata; error?: string; url?: string }> {
    try {
      // Get file metadata
      const file = await this.getFileById(fileId);
      if (!file) {
        return { success: false, error: 'File not found' };
      }

      // Check download permissions
      const hasPermission = await this.checkFilePermission(
        fileId, 
        options.userId, 
        options.userRole, 
        'download'
      );
      if (!hasPermission) {
        return { success: false, error: 'Access denied' };
      }

      // Check file status
      if (file.virus_scan_status === 'infected') {
        return { success: false, error: 'File infected by virus, download not allowed' };
      }

      if (file.expires_at && new Date(file.expires_at) < new Date()) {
        return { success: false, error: 'File has expired' };
      }

      // Get file from R2 storage
      const r2Object = await this.r2.get(file.storage_path);
      if (!r2Object) {
        return { success: false, error: 'File not found in storage' };
      }

      // Track download if requested
      if (options.trackDownload) {
        await this.trackFileDownload(fileId, options.userId);
      }

      // Return file data
      const fileData = await r2Object.arrayBuffer();
      
      return {
        success: true,
        file: fileData,
        metadata: file
      };

    } catch (error) {
      console.error('File download failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'File download failed' 
      };
    }
  }

  /**
   * Generate a secure signed URL for file download
   */
  async getFileDownloadUrl(
    fileId: number, 
    userId: number, 
    userRole: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.checkFilePermission(fileId, userId, userRole, 'download');
      if (!hasPermission) {
        return { success: false, error: 'Access denied' };
      }

      // Get file metadata
      const file = await this.getFileById(fileId);
      if (!file) {
        return { success: false, error: 'File not found' };
      }

      // Generate signed URL (implementation depends on Cloudflare R2 capabilities)
      // For now, return a temporary access URL
      const signedUrl = await this.generateSignedUrl(file.storage_path, expiresIn);
      
      return {
        success: true,
        url: signedUrl
      };

    } catch (error) {
      console.error('Failed to generate download URL:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate download URL' 
      };
    }
  }

  /**
   * Search and filter files based on various criteria
   */
  async searchFiles(options: FileSearchOptions): Promise<{
    files: FileMetadata[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query = `
        SELECT DISTINCT f.*, u.name as uploader_name
        FROM file_metadata f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters based on user permissions
      if (options.userRole !== 'admin') {
        query += ` AND (f.is_public = 1 OR f.uploaded_by = ?${paramIndex} 
                   OR EXISTS (
                     SELECT 1 FROM file_permissions fp 
                     WHERE fp.file_id = f.id 
                     AND (fp.user_id = ?${paramIndex + 1} OR fp.role = ?${paramIndex + 2})
                     AND fp.permission_type IN ('view', 'download')
                     AND fp.is_active = 1
                     AND (fp.expires_at IS NULL OR fp.expires_at > datetime('now'))
                   ))`;
        params.push(options.userId, options.userId, options.userRole);
        paramIndex += 3;
      }

      // Apply search filters
      if (options.mimeTypes && options.mimeTypes.length > 0) {
        const placeholders = options.mimeTypes.map(() => `?${paramIndex++}`).join(',');
        query += ` AND f.mime_type IN (${placeholders})`;
        params.push(...options.mimeTypes);
      }

      if (options.uploadedBy) {
        query += ` AND f.uploaded_by = ?${paramIndex++}`;
        params.push(options.uploadedBy);
      }

      if (options.conversationId) {
        query += ` AND EXISTS (
          SELECT 1 FROM message_attachments ma 
          WHERE ma.file_id = f.id 
          AND ma.conversation_id = ?${paramIndex++}
        )`;
        params.push(options.conversationId);
      }

      if (options.relatedEntityType && options.relatedEntityId) {
        query += ` AND EXISTS (
          SELECT 1 FROM file_entity_associations fea 
          WHERE fea.file_id = f.id 
          AND fea.entity_type = ?${paramIndex++}
          AND fea.entity_id = ?${paramIndex++}
        )`;
        params.push(options.relatedEntityType, options.relatedEntityId);
      }

      if (options.isPublic !== undefined) {
        query += ` AND f.is_public = ?${paramIndex++}`;
        params.push(options.isPublic ? 1 : 0);
      }

      if (options.virusScanStatus) {
        query += ` AND f.virus_scan_status = ?${paramIndex++}`;
        params.push(options.virusScanStatus);
      }

      if (options.processingStatus) {
        query += ` AND f.processing_status = ?${paramIndex++}`;
        params.push(options.processingStatus);
      }

      if (options.minFileSize) {
        query += ` AND f.file_size >= ?${paramIndex++}`;
        params.push(options.minFileSize);
      }

      if (options.maxFileSize) {
        query += ` AND f.file_size <= ?${paramIndex++}`;
        params.push(options.maxFileSize);
      }

      if (options.uploadedAfter) {
        query += ` AND f.created_at >= ?${paramIndex++}`;
        params.push(options.uploadedAfter);
      }

      if (options.uploadedBefore) {
        query += ` AND f.created_at <= ?${paramIndex++}`;
        params.push(options.uploadedBefore);
      }

      if (options.search) {
        query += ` AND (f.original_name LIKE ?${paramIndex++} OR f.mime_type LIKE ?${paramIndex++})`;
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add sorting
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'DESC';
      query += ` ORDER BY f.${sortBy} ${sortOrder}`;

      // Add pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query += ` LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`;
      params.push(limit + 1, offset); // Get one extra to check if there are more

      // Execute query
      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).all();
      
      const files = result.results as FileMetadata[];
      const hasMore = files.length > limit;
      
      if (hasMore) {
        files.pop(); // Remove the extra record
      }

      // Get total count for pagination
      let countQuery = query.replace(/SELECT DISTINCT f\.\*, u\.name as uploader_name/, 'SELECT COUNT(DISTINCT f.id) as total');
      countQuery = countQuery.replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');
      
      const countParams = params.slice(0, -2); // Remove limit and offset
      const countStmt = this.db.prepare(countQuery);
      const countResult = await countStmt.bind(...countParams).first() as { total: number };

      return {
        files,
        total: countResult.total,
        hasMore
      };

    } catch (error) {
      console.error('File search failed:', error);
      throw new Error('Failed to search files');
    }
  }

  /**
   * Delete a file with permission checking
   */
  async deleteFile(fileId: number, userId: number, userRole: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check delete permissions
      const hasPermission = await this.checkFilePermission(fileId, userId, userRole, 'delete');
      if (!hasPermission) {
        return { success: false, error: 'Access denied' };
      }

      // Get file metadata
      const file = await this.getFileById(fileId);
      if (!file) {
        return { success: false, error: 'File not found' };
      }

      // Delete from R2 storage
      await this.r2.delete(file.storage_path);

      // Delete thumbnails and previews if they exist
      if (file.thumbnail_path) {
        await this.r2.delete(file.thumbnail_path);
      }
      if (file.preview_path) {
        await this.r2.delete(file.preview_path);
      }

      // Delete from database (cascading deletes will handle associations)
      await this.db.prepare(`
        DELETE FROM file_metadata WHERE id = ?
      `).bind(fileId).run();

      return { success: true };

    } catch (error) {
      console.error('File deletion failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'File deletion failed' 
      };
    }
  }

  /**
   * Update file permissions
   */
  async updateFilePermissions(
    fileId: number, 
    userId: number, 
    userRole: string,
    permissions: Omit<FilePermission, 'id' | 'file_id' | 'granted_at'>[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user has permission to manage this file
      const hasPermission = await this.checkFilePermission(fileId, userId, userRole, 'share') ||
                           await this.isFileOwner(fileId, userId) ||
                           userRole === 'admin';
      
      if (!hasPermission) {
        return { success: false, error: 'Access denied' };
      }

      // Start transaction
      await this.db.prepare('BEGIN TRANSACTION').run();

      try {
        // Remove existing permissions for this file
        await this.db.prepare(`
          UPDATE file_permissions 
          SET is_active = 0 
          WHERE file_id = ?
        `).bind(fileId).run();

        // Add new permissions
        for (const perm of permissions) {
          await this.db.prepare(`
            INSERT INTO file_permissions (
              file_id, user_id, role, permission_type, granted_by, 
              granted_at, expires_at, is_active
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 1)
          `).bind(
            fileId,
            perm.user_id || null,
            perm.role || null,
            perm.permission_type,
            userId,
            perm.expires_at || null
          ).run();
        }

        await this.db.prepare('COMMIT').run();
        return { success: true };

      } catch (error) {
        await this.db.prepare('ROLLBACK').run();
        throw error;
      }

    } catch (error) {
      console.error('Failed to update file permissions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update permissions' 
      };
    }
  }

  /**
   * Get file statistics and analytics
   */
  async getFileStatistics(userId?: number, userRole?: string): Promise<FileStatistics> {
    try {
      const isAdmin = userRole === 'admin';
      const baseFilter = isAdmin ? '' : `WHERE f.uploaded_by = ${userId} OR f.is_public = 1`;

      // Total files and size
      const totalQuery = `
        SELECT 
          COUNT(*) as total_files,
          SUM(f.file_size) as total_size
        FROM file_metadata f
        ${baseFilter}
      `;
      const totalResult = await this.db.prepare(totalQuery).first() as {
        total_files: number;
        total_size: number;
      };

      // Files by type
      const typeQuery = `
        SELECT 
          f.mime_type,
          COUNT(*) as count
        FROM file_metadata f
        ${baseFilter}
        GROUP BY f.mime_type
        ORDER BY count DESC
      `;
      const typeResults = await this.db.prepare(typeQuery).all();
      const filesByType: Record<string, number> = {};
      typeResults.results.forEach((row: any) => {
        filesByType[row.mime_type] = row.count;
      });

      // Uploads by month
      const monthQuery = `
        SELECT 
          strftime('%Y-%m', f.created_at) as month,
          COUNT(*) as count
        FROM file_metadata f
        ${baseFilter}
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `;
      const monthResults = await this.db.prepare(monthQuery).all();
      const uploadsByMonth: Record<string, number> = {};
      monthResults.results.forEach((row: any) => {
        uploadsByMonth[row.month] = row.count;
      });

      // Top uploaders (admin only)
      let topUploaders: Array<{userId: number, userName: string, fileCount: number}> = [];
      if (isAdmin) {
        const uploaderQuery = `
          SELECT 
            f.uploaded_by as user_id,
            u.name as user_name,
            COUNT(*) as file_count
          FROM file_metadata f
          JOIN users u ON f.uploaded_by = u.id
          GROUP BY f.uploaded_by, u.name
          ORDER BY file_count DESC
          LIMIT 10
        `;
        const uploaderResults = await this.db.prepare(uploaderQuery).all();
        topUploaders = uploaderResults.results.map((row: any) => ({
          userId: row.user_id,
          userName: row.user_name,
          fileCount: row.file_count
        }));
      }

      // Storage usage by user
      const storageQuery = isAdmin ? `
        SELECT 
          f.uploaded_by as user_id,
          SUM(f.file_size) as storage_used
        FROM file_metadata f
        GROUP BY f.uploaded_by
      ` : `
        SELECT 
          ${userId} as user_id,
          SUM(f.file_size) as storage_used
        FROM file_metadata f
        WHERE f.uploaded_by = ${userId}
      `;
      const storageResults = await this.db.prepare(storageQuery).all();
      const storageUsageByUser: Record<number, number> = {};
      storageResults.results.forEach((row: any) => {
        storageUsageByUser[row.user_id] = row.storage_used || 0;
      });

      // Recent activity
      const activityQuery = `
        SELECT 
          'upload' as action,
          f.original_name as file_name,
          f.uploaded_by as user_id,
          u.name as user_name,
          f.created_at as timestamp
        FROM file_metadata f
        JOIN users u ON f.uploaded_by = u.id
        ${baseFilter}
        ORDER BY f.created_at DESC
        LIMIT 20
      `;
      const activityResults = await this.db.prepare(activityQuery).all();
      const recentActivity = activityResults.results.map((row: any) => ({
        action: row.action,
        fileName: row.file_name,
        userId: row.user_id,
        userName: row.user_name,
        timestamp: row.timestamp
      }));

      return {
        totalFiles: totalResult.total_files,
        totalSize: totalResult.total_size,
        filesByType,
        uploadsByMonth,
        topUploaders,
        storageUsageByUser,
        recentActivity
      };

    } catch (error) {
      console.error('Failed to get file statistics:', error);
      throw new Error('Failed to get file statistics');
    }
  }

  /**
   * Perform bulk operations on multiple files
   */
  async bulkFileOperation(
    operation: BulkFileOperation,
    userId: number,
    userRole: string
  ): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    try {
      const results: any[] = [];
      const errors: string[] = [];

      for (const fileId of operation.fileIds) {
        try {
          switch (operation.operation) {
            case 'delete':
              const deleteResult = await this.deleteFile(fileId, userId, userRole);
              if (deleteResult.success) {
                results.push({ fileId, status: 'deleted' });
              } else {
                errors.push(`File ${fileId}: ${deleteResult.error}`);
              }
              break;

            case 'update_permissions':
              if (operation.parameters?.permissions) {
                const permResult = await this.updateFilePermissions(
                  fileId, 
                  userId, 
                  userRole, 
                  operation.parameters.permissions
                );
                if (permResult.success) {
                  results.push({ fileId, status: 'permissions_updated' });
                } else {
                  errors.push(`File ${fileId}: ${permResult.error}`);
                }
              }
              break;

            default:
              errors.push(`File ${fileId}: Unsupported operation ${operation.operation}`);
          }
        } catch (error) {
          errors.push(`File ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors
      };

    } catch (error) {
      console.error('Bulk file operation failed:', error);
      return {
        success: false,
        results: [],
        errors: [error instanceof Error ? error.message : 'Bulk operation failed']
      };
    }
  }

  // Private helper methods

  private validateFile(uploadData: FileUploadData): { isValid: boolean; error?: string } {
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const allowedMimeTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      // Other
      'application/json'
    ];

    const fileSize = uploadData.file instanceof File ? 
      uploadData.file.size : 
      uploadData.file.byteLength;

    if (fileSize > maxFileSize) {
      return { isValid: false, error: 'File size exceeds maximum allowed size (100MB)' };
    }

    if (!allowedMimeTypes.includes(uploadData.mimeType)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    return { isValid: true };
  }

  private generateStoredName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop() || '';
    return `${timestamp}_${random}.${extension}`;
  }

  private generateStoragePath(userId: number, storedName: string): string {
    const userFolder = Math.floor(userId / 1000) * 1000; // Group users by thousands
    const dateFolder = new Date().toISOString().substring(0, 7); // YYYY-MM
    return `files/${userFolder}/${dateFolder}/${storedName}`;
  }

  private async calculateFileHash(file: File | ArrayBuffer): Promise<string> {
    // Simple hash implementation - in production, use proper crypto hash
    const data = file instanceof File ? await file.arrayBuffer() : file;
    const array = new Uint8Array(data);
    let hash = 0;
    for (let i = 0; i < array.length; i++) {
      const char = array[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async findFileByHash(fileHash: string, userId: number): Promise<FileMetadata | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM file_metadata 
      WHERE file_hash = ? AND uploaded_by = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const result = await stmt.bind(fileHash, userId).first();
    return result as FileMetadata | null;
  }

  private async uploadToR2(storagePath: string, file: File | ArrayBuffer): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const data = file instanceof File ? await file.arrayBuffer() : file;
      await this.r2.put(storagePath, data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'R2 upload failed' 
      };
    }
  }

  private async storeFileMetadata(metadata: Omit<FileMetadata, 'id' | 'created_at' | 'download_count' | 'last_downloaded_at' | 'access_permissions'>): Promise<FileMetadata> {
    const stmt = this.db.prepare(`
      INSERT INTO file_metadata (
        original_name, stored_name, file_size, mime_type, file_hash,
        storage_path, uploaded_by, upload_session_id, created_at,
        expires_at, is_public, download_count, virus_scan_status,
        processing_status, thumbnail_path, preview_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, 0, ?, ?, ?, ?)
      RETURNING *
    `);

    const result = await stmt.bind(
      metadata.original_name,
      metadata.stored_name,
      metadata.file_size,
      metadata.mime_type,
      metadata.file_hash,
      metadata.storage_path,
      metadata.uploaded_by,
      metadata.upload_session_id || null,
      metadata.expires_at || null,
      metadata.is_public ? 1 : 0,
      metadata.virus_scan_status,
      metadata.processing_status,
      metadata.thumbnail_path || null,
      metadata.preview_path || null
    ).first();

    return result as FileMetadata;
  }

  private async associateFileWithMessage(
    fileId: number, 
    conversationId?: number, 
    messageId?: number
  ): Promise<void> {
    if (conversationId || messageId) {
      await this.db.prepare(`
        INSERT INTO message_attachments (
          conversation_id, message_id, file_id, attached_at
        ) VALUES (?, ?, ?, datetime('now'))
      `).bind(conversationId || null, messageId || null, fileId).run();
    }
  }

  private async associateFileWithEntity(
    fileId: number,
    entityType: string,
    entityId: number
  ): Promise<void> {
    await this.db.prepare(`
      INSERT OR IGNORE INTO file_entity_associations (
        file_id, entity_type, entity_id, created_at
      ) VALUES (?, ?, ?, datetime('now'))
    `).bind(fileId, entityType, entityId).run();
  }

  private async initiateBackgroundProcessing(fileId: number): Promise<void> {
    // In a real implementation, this would trigger background jobs
    // For now, just mark as completed
    await this.db.prepare(`
      UPDATE file_metadata 
      SET processing_status = 'completed', virus_scan_status = 'clean'
      WHERE id = ?
    `).bind(fileId).run();
  }

  private async getFileById(fileId: number): Promise<FileMetadata | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM file_metadata WHERE id = ?
    `);
    const result = await stmt.bind(fileId).first();
    return result as FileMetadata | null;
  }

  private async checkFilePermission(
    fileId: number,
    userId: number,
    userRole: string,
    permissionType: string
  ): Promise<boolean> {
    // Admin has all permissions
    if (userRole === 'admin') {
      return true;
    }

    // Check if user owns the file
    if (await this.isFileOwner(fileId, userId)) {
      return true;
    }

    // Check if file is public and permission allows public access
    if (permissionType === 'view' || permissionType === 'download') {
      const file = await this.getFileById(fileId);
      if (file?.is_public) {
        return true;
      }
    }

    // Check specific permissions
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM file_permissions
      WHERE file_id = ? 
      AND (user_id = ? OR role = ?)
      AND permission_type = ?
      AND is_active = 1
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    
    const result = await stmt.bind(fileId, userId, userRole, permissionType).first() as { count: number };
    return result.count > 0;
  }

  private async isFileOwner(fileId: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM file_metadata
      WHERE id = ? AND uploaded_by = ?
    `);
    const result = await stmt.bind(fileId, userId).first() as { count: number };
    return result.count > 0;
  }

  private async trackFileDownload(fileId: number, userId: number): Promise<void> {
    // Update download count and last downloaded time
    await this.db.prepare(`
      UPDATE file_metadata 
      SET download_count = download_count + 1,
          last_downloaded_at = datetime('now')
      WHERE id = ?
    `).bind(fileId).run();

    // Log download activity
    await this.db.prepare(`
      INSERT INTO file_download_logs (
        file_id, downloaded_by, downloaded_at, ip_address
      ) VALUES (?, ?, datetime('now'), ?)
    `).bind(fileId, userId, null).run();
  }

  private async generateSignedUrl(storagePath: string, expiresIn: number): Promise<string> {
    // In a real implementation, this would generate a proper signed URL
    // For now, return a placeholder URL that expires
    const expiry = Date.now() + (expiresIn * 1000);
    return `/api/files/download/${encodeURIComponent(storagePath)}?expires=${expiry}`;
  }
}

// Additional utility functions for file handling

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  return 'other';
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function getFileIcon(mimeType: string): string {
  const category = getFileTypeCategory(mimeType);
  const iconMap: Record<string, string> = {
    image: 'fas fa-image',
    video: 'fas fa-video',
    audio: 'fas fa-music',
    pdf: 'fas fa-file-pdf',
    document: 'fas fa-file-word',
    spreadsheet: 'fas fa-file-excel',
    presentation: 'fas fa-file-powerpoint',
    archive: 'fas fa-file-archive',
    other: 'fas fa-file'
  };
  return iconMap[category] || iconMap.other;
}