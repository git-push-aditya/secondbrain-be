import {signInUpZodMiddleware} from '../middlewares/zodMiddleware';
import { Router } from 'express';
import {signUp, signIn} from '../controllers/authController'
import { cookieOptions } from '../utils/setCookies';

const router = Router();

router.post('/signup', signInUpZodMiddleware, signUp);
router.post('/signin', signInUpZodMiddleware, signIn);


router.post('/logout', (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(200).json({
    status: "success",
    payload: {
      message: "Logged out successfully"
    }
  });
});

export default router;