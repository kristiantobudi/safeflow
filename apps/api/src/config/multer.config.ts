import { diskStorage, memoryStorage } from 'multer';

export const multerConfigPdf = {
  storage: diskStorage({
    destination: './uploads/materi',
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

export const multerConfigExcel = {
  storage: memoryStorage(),
};
