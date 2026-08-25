import dgram from "node:dgram"

const MAC_PATTERN = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/

export function isValidMacAddress(mac: string): boolean {
  return MAC_PATTERN.test(mac)
}

// IEEE magic packet: 6 bytes of 0xFF, then the target MAC repeated 16 times.
function buildMagicPacket(mac: string): Buffer {
  const macBytes = Buffer.from(mac.split(":").map((byte) => parseInt(byte, 16)))
  return Buffer.concat([Buffer.alloc(6, 0xff), ...Array<Buffer>(16).fill(macBytes)])
}

// Sends the magic packet as a single UDP datagram. This only wakes the
// target if something on the receiving end forwards it to that LAN's
// broadcast address — see docs/PRODUCTION_SETUP.md's Wake-on-LAN note for
// the router port-forward this assumes (WOL_TARGET_HOST is the home
// router's public IP/hostname, not the PC's own address).
export function sendMagicPacket(mac: string, host: string, port: number): Promise<void> {
  const packet = buildMagicPacket(mac)
  const socket = dgram.createSocket("udp4")

  return new Promise((resolve, reject) => {
    socket.once("error", (error) => {
      socket.close()
      reject(error)
    })
    socket.send(packet, port, host, (error) => {
      socket.close()
      if (error) reject(error)
      else resolve()
    })
  })
}
