import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Uso: node scripts/set-admin-claim.js <email>');
        process.exit(1);
    }

    const app = getApps().length
        ? getApps()[0]
        : initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });

    const auth = getAuth(app);
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });

    console.log(`Listo: ${email} (uid: ${user.uid}) ahora tiene el claim admin:true`);
    console.log(
        'El usuario debe cerrar sesión y volver a entrar (o forzar refresh del token) para que el claim nuevo aparezca en su ID token.',
    );
}

main().catch((error) => {
    console.error('Error asignando el claim:', error);
    process.exit(1);
});
