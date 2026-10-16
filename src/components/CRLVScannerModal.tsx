import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  SwitchCamera,
  Image as ImageIcon,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Vehicle } from '../types';
import { extractCrlvData } from '../services/apiService';

interface CRLVScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (scannedData: Partial<Vehicle>) => void;
}

export const CRLVScannerModal: React.FC<CRLVScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [scanResult, setScanResult] = useState<Partial<Vehicle> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Check for available video input devices
  const checkCameras = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  // Stop camera media tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start live camera stream
  const startCameraStream = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não suporta acesso direto à câmera. Use a opção de envio de foto.');
      setActiveTab('upload');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      await checkCameras();
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permissão de acesso à câmera negada. Você pode tirar foto usando o botão abaixo ou enviar o arquivo.'
          : 'Não foi possível inicializar a câmera ao vivo. Use o botão de captura nativa do celular.';
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [facingMode, checkCameras, stopCameraStream]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setErrorMessage('');
      setCapturedPreview(null);
      setIsProcessing(false);
      if (activeTab === 'camera') {
        startCameraStream();
      }
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Switch between front and back cameras
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  // Capture snapshot from the live video stream
  const handleCaptureFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedPreview(base64Data);
    stopCameraStream();
    processCrlvPayload(base64Data, 'image/jpeg', 'camera-capture.jpg');
  };

  // Handle file selected from file picker / mobile capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCapturedPreview(file.type.startsWith('image/') ? base64 : null);
        stopCameraStream();
        processCrlvPayload(base64, file.type || 'image/jpeg', file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Main processing pipeline
  const processCrlvPayload = async (base64Data: string, mimeType: string, fileName: string) => {
    setIsProcessing(true);
    setErrorMessage('');
    setProcessingStep('Digitalizando documento CRLV...');

    try {
      setProcessingStep('Lendo texto e campos via Inteligência Artificial e OCR...');

      const result = await extractCrlvData({
        base64Data,
        mimeType,
        fileName,
      });

      if (result.success && result.data) {
        setProcessingStep('Dados do veículo extraídos com sucesso!');
        setScanResult(result.data);
      } else {
        throw new Error(result.error || 'Não foi possível extrair dados válidos deste documento CRLV.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(
        err?.message ||
          'Falha ao ler o documento CRLV. Certifique-se de que a foto está nítida e bem iluminada.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and send to vehicle registration form
  const handleConfirmAndOpenForm = () => {
    if (scanResult) {
      onScanComplete(scanResult);
      onClose();
    }
  };

  // Retake scan
  const handleRetake = () => {
    setScanResult(null);
    setCapturedPreview(null);
    setErrorMessage('');
    if (activeTab === 'camera') {
      startCameraStream();
    }
  };

  return (
    <div
      id="crlv-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="crlv-scanner-modal-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Escanear CRLV do Veículo
              </h3>
              <p className="text-xs text-slate-500">
                Digitalize o documento pelo celular ou PC para preencher o cadastro automaticamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        {!scanResult && !isProcessing && (
          <div className="flex border-b border-slate-200 bg-slate-100/60 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCameraStream();
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Câmera ao Vivo (Celular / Webcam)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCameraStream();
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Tirar Foto / Enviar Arquivo</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Error notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-[11px] text-red-600 mt-0.5">
                  Tente tirar outra foto mais nítida ou aproximar o documento da câmera.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetake}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* 1. SUCCESS RESULT SCREEN: SHOW SCANNED DATA SUMMARY */}
          {scanResult && !isProcessing && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    CRLV Escaneado com Sucesso!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    As informações do veículo foram extraídas e estão prontas para conferência e salvamento no formulário.
                  </p>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Dados Extraídos do CRLV
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    Extração Automática
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Placa</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {scanResult.plate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">RENAVAM</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {scanResult.renavam || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tipo de Veículo</span>
                    <span className="font-semibold text-slate-800">
                      {scanResult.vehicleType || 'Toco'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Marca / Modelo</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {scanResult.brandModel || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Ano Fab/Mod</span>
                    <span className="font-semibold text-slate-800">
                      {scanResult.yearFabMod || '—'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Chassi (VIN)</span>
                    <span className="font-mono text-[11px] text-slate-800">
                      {scanResult.chassis || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Combustível</span>
                    <span className="font-semibold text-slate-800">
                      {scanResult.fuel || '—'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Proprietário</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {scanResult.ownerName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">CNPJ/CPF</span>
                    <span className="font-mono text-slate-800">
                      {scanResult.ownerCnpjCpf || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Escanear Outro Documento</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndOpenForm}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Conferir no Cadastro de Veículo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 2. PROCESSING STATE */}
          {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-blue-100 animate-ping opacity-75" />
                <div className="relative w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl">
                  <Sparkles className="w-10 h-10 animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Processando Documento CRLV...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  {processingStep || 'Extraindo placa, renavam, chassi e proprietário com IA...'}
                </p>
              </div>
              <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-full h-full bg-blue-600 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* 3. ACTIVE LIVE CAMERA TAB */}
          {!scanResult && !isProcessing && activeTab === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">{cameraError}</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Você pode usar o botão abaixo para abrir a câmera padrão do seu smartphone ou selecionar uma foto.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Abrir Câmera do Celular</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Enviar Arquivo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] sm:aspect-video flex items-center justify-center border-2 border-slate-300 shadow-inner">
                  {/* Live Video Element */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Document Framing Overlay HUD */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                    <div className="bg-slate-900/70 backdrop-blur-xs text-white px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Enquadre o documento CRLV dentro do retângulo</span>
                    </div>

                    {/* Target Box Guide */}
                    <div className="w-[85%] h-[68%] border-2 border-dashed border-white/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                    </div>

                    <div className="text-[11px] text-white/80 bg-slate-900/60 px-2.5 py-0.5 rounded-full">
                      Mantenha a câmera firme e com boa iluminação
                    </div>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
                    {hasMultipleCameras && (
                      <button
                        type="button"
                        onClick={handleToggleFacingMode}
                        className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                        title="Alternar Câmera"
                      >
                        <SwitchCamera className="w-5 h-5" />
                      </button>
                    )}

                    {/* Shutter Capture Button */}
                    <button
                      type="button"
                      onClick={handleCaptureFromVideo}
                      className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 active:scale-95 cursor-pointer border-2 border-white"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Capturar e Processar CRLV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Native Camera fallback button */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Problemas com a câmera ao vivo?</span>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Tirar foto com app de câmera nativo do celular
                </button>
              </div>
            </div>
          )}

          {/* 4. UPLOAD / FILE PICKER TAB */}
          {!scanResult && !isProcessing && activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Selecione ou Arraste o Documento CRLV
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Formatos aceitos: Imagem (JPG, PNG) ou documento digital (PDF do CRLV-e / Senatran)
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs">
                    Escolher Arquivo do Computador / Celular
                  </span>
                </div>
              </div>

              {/* Smartphone Quick Actions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>No celular? Tire uma foto direta da câmera agora:</span>
                </div>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Fotografar Documento Agora</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden Inputs */}
          {/* 1. General file picker (PDF or Images) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 2. Direct mobile camera capture input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Processamento seguro compatível com padrão SENATRAN / DETRAN</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
