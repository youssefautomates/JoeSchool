import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JoeSchool',
    short_name: 'JoeSchool',
    description: 'أكاديمية جو سكول لإنتاج المحتوى الاحترافي بالذكاء الاصطناعي، الفيديوهات السينمائية، والأدوات الإبداعية للمبدعين.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
