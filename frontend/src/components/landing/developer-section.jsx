"use client";

import { motion } from "framer-motion";
import { Terminal, Code2, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { GradientButton } from "@/components/ui/gradient-button";

const snippets = {
  node: `import { StorageCloud } from '@storagecloud/sdk';

const client = new StorageCloud({
  apiKey: process.env.STORAGECLOUD_API_KEY,
});

// Upload a file
const { url } = await client.upload({
  bucket: 'my-assets',
  key: 'videos/intro.mp4',
  file: fileBuffer,
  contentType: 'video/mp4',
});

// Generate presigned download URL
const signedUrl = await client.getPresignedUrl({
  bucket: 'my-assets',
  key: 'videos/intro.mp4',
  expiresIn: 3600,
});`,

  curl: `# Upload via presigned URL
curl -X PUT "https://api.storagecloud.io/presign/upload" \\
  -H "X-API-Key: sk_live_xxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"bucket":"my-assets","key":"data.json"}'

# Response: { "url": "https://...", "expiresAt": "..." }

# Direct upload to MinIO (no proxy!)
curl -X PUT "$presigned_url" \\
  -H "Content-Type: application/json" \\
  --data-binary @data.json`,

  s3: `import boto3

s3 = boto3.client('s3',
  endpoint_url='https://api.storagecloud.io',
  aws_access_key_id='your-api-key',
  aws_secret_access_key='your-api-secret',
)

# Works with any S3-compatible code
s3.upload_file('local.csv', 'analytics', 'data/2024.csv')

paginator = s3.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket='analytics'):
    for obj in page['Contents']:
        print(obj['Key'])`,
};

export function DeveloperSection() {
  return (
    <section id="developers" className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/2 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-medium mb-6">
              <Code2 className="w-3 h-3" />
              Developer-first
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight leading-tight">
              Works with your
              <br />
              <span className="gradient-text">existing tools</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              StorageCloud is 100% S3-compatible. Use boto3, the AWS SDK, rclone, s3cmd, or any S3 tool without changes.
              Or use our official SDKs for a first-class experience.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { label: "S3-compatible API", desc: "Drop-in replacement, zero code changes" },
                { label: "Official SDKs", desc: "Node.js, Python, Go, Ruby — with TypeScript types" },
                { label: "OpenAPI spec", desc: "Generate clients in any language" },
                { label: "Webhook events", desc: "Object created, deleted, quota exceeded" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mt-0.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <GradientButton href="/docs" variant="outline">
              <Terminal className="w-4 h-4" />
              Read the docs <ArrowRight className="w-3.5 h-3.5" />
            </GradientButton>
          </motion.div>

          {/* Right: code */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4"
          >
            <CodeBlock code={snippets.node} language="Node.js SDK" />
            <CodeBlock code={snippets.curl} language="REST API (curl)" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
