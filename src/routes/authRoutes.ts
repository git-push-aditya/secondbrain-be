import {signInUpZodMiddleware} from '../middlewares/zodMiddleware';
import { Router } from 'express';
import {signUp, signIn} from '../controllers/authController'

const router = Router();

router.post('/signup', signInUpZodMiddleware, signUp);
router.post('/signin', signInUpZodMiddleware, signIn);


router.post('/logout', (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false, // or `isProd`
    sameSite: "strict",
    path: "/"
  });
  res.status(200).json({
    status: "success",
    payload: {
      message: "Logged out successfully"
    }
  });
});

export default router;