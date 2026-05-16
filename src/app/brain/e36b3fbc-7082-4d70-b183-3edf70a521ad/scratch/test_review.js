const fetch = require('node-fetch');

async function testReview() {
  const review = {
    productId: "9f9a74a1-0678-430c-84d7-0103e53f5f59", // Assuming this ID exists or I should find one
    firstName: "يوسف",
    lastName: "مصطفى",
    rating: 5,
    text: "هذا المنتج غير حياتي للأفضل! الأتمتة وفرت علي الكثير من الوقت والمجهود. أنصح به بشدة لكل شخص يريد تطوير عمله.",
    avatarUrl: "https://github.com/shadcn.png",
    isVerified: true,
    isHidden: false
  };

  try {
    const res = await fetch('http://localhost:3000/api/admin/reviews', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': 'admin_token=authenticated'
      },
      body: JSON.stringify(review)
    });

    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testReview();
