# Simple, single-stage builder (Python 3.13 base; add Node 22)
FROM public.ecr.aws/sam/build-python3.13:latest

WORKDIR /tmp

# Match modern Lambda runtimes
ENV AWS_EXECUTION_ENV=AWS_Lambda_python3.13 \
    PYTHONPATH=/var/runtime

# Install minimal tools + Node.js 22 (binary tarball) + upgrade pip tooling
RUN set -eux; \
    (dnf -y install xz zip || microdnf -y install xz zip || true); \
    curl -fsSL https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz -o /tmp/node.tar.xz; \
    tar -xJf /tmp/node.tar.xz -C /opt; \
    ln -s /opt/node-v22.11.0-linux-x64/bin/node /usr/local/bin/node; \
    ln -s /opt/node-v22.11.0-linux-x64/bin/npm  /usr/local/bin/npm; \
    ln -s /opt/node-v22.11.0-linux-x64/bin/npx  /usr/local/bin/npx; \
    python -m pip install --upgrade pip setuptools wheel virtualenv pipenv

WORKDIR /build
