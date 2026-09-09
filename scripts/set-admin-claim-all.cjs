const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

async function main() {
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

    let nextPageToken;
    let total = 0;
    let updated = 0;

    do {
        const page = await auth.listUsers(1000, nextPageToken);

        for (const user of page.users) {
            total += 1;

            if (user.customClaims?.admin === true) {
                console.log(`Ya tenía admin:true: ${user.email ?? user.uid}`);
                continue;
            }

            await auth.setCustomUserClaims(user.uid, { admin: true });
            updated += 1;
            console.log(`Actualizado: ${user.email ?? user.uid}`);
        }

        nextPageToken = page.pageToken;
    } while (nextPageToken);

    console.log(`Listo: ${updated}/${total} usuarios ahora tienen admin:true.`);
    console.log(
        'Cada usuario debe cerrar sesión y volver a entrar (o forzar refresh del token) para que el claim nuevo aparezca en su ID token.',
    );
}

main().catch((error) => {
    console.error('Error asignando el claim a todos los usuarios:', error);
    process.exit(1);
});
