"use server"

import { authOptions } from '@/auth-options';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

function getCurrentThaiYear(): number {
    const currentYear = new Date().getFullYear();
    return currentYear + 543; // เปลี่ยนปีคริสต์ศักราชเป็นปีพุทธศักราช
  }

async function getLastestDocNumber() {
  const currentYear = getCurrentThaiYear();
  const yearSuffix = currentYear.toString();
  
  const latestDocument = await prisma.document.findFirst({
    where: {
      year:yearSuffix,
    },
    orderBy: {
      date: 'desc',
    },
  });

  let newDocNo = 1;
  if (latestDocument) {
    const latestDocNo = latestDocument.docNo
    newDocNo = latestDocNo + 1;
  }

  return {newDocNo,yearSuffix}
}


export async function addDocument(prevState: {message: string, err: boolean}, formData: FormData) {
  const session = await getServerSession(authOptions)
  if(!session || !session.pea){
      redirect("/api/auth/signin")
  }

  const type = formData.get("type")?.toString()
  if(!type){
    return {
      message: "กรุณาใส่ประเภทเอกสาร",
      err: true
    }
  }

  const name = formData.get("name")?.toString()
  if(!name){
    return {
      message: "กรุณาใส่ชื่อเอกสาร",
      err: true
    }
  }
  let note = formData.get("note")?.toString()
  if(!note){
    note = "-"
  }

  const amountStr = formData.get("amount")?.toString()
  if(!amountStr || !/^\d+(\.\d{1,2})?$/.test(amountStr)){
    return {
      message: "กรุณาใส่จำนวนเงินให้ถูกต้อง (ไม่มีลูกน้ำ และทศนิยมไม่เกิน 2 ตำแหน่ง)",
      err: true
    }
  }

  let amount = parseFloat(amountStr)

  const data = {
    type,
    name,
    note,
    amount,
    userId: session.pea.id,
    fromSectionId: session.pea.section.id,
  }

  const {newDocNo,yearSuffix} = await getLastestDocNumber()

  // สร้างเอกสารใหม่
  const newDocument = await prisma.document.create({
    data: {
      ...data,
      docNo: newDocNo,
      year: yearSuffix,
      date: new Date()
    },
    select: {
      status:true,
      id: true,
      docNo: true,
      year: true
    }
  });

  const newStatus = await prisma.status.create({
    data: {
        name: "รอเอกสารต้นฉบับ",
        date: new Date(),
        documentId: newDocument.id,
        updatedByUserId: session.pea.id
    }
  })
  return {
    err: false,
    message: newDocument.id
  }
}

