import React from "react";
import { SEO } from "../components/SEO";
import { SajawatHero } from "../components/Sajawat/SajawatHero";
import { SajawatServicesGrid } from "../components/Sajawat/SajawatServicesGrid";
import { SajawatGallery } from "../components/Sajawat/SajawatGallery";
import { SajawatMeetingForm } from "../components/Sajawat/SajawatMeetingForm";
import { SajawatWhyChoose } from "../components/Sajawat/SajawatWhyChoose";
import { SajawatWeddingJourneyCta } from "../components/Sajawat/SajawatWeddingJourneyCta";
import { SajawatFooter } from "../components/Sajawat/SajawatFooter";
import { SajawatBottomBar } from "../components/Sajawat/SajawatBottomBar";

const Sajawat: React.FC = () => (
  <>
    <SEO
      title="Sajawat by Genda Phool — Wedding Floral Decor"
      description="Transform your Indian wedding with enchanting floral decor. Haldi, Mehendi, wedding day and reception — bespoke designs by Sajawat by Genda Phool."
      canonical="https://customerapp.mygendaphool.com/sajawat"
    />
    <div className="min-h-screen bg-white">
      <SajawatHero />
      <SajawatServicesGrid />
      <SajawatGallery />
      <SajawatMeetingForm />
      <SajawatWhyChoose />
      <SajawatWeddingJourneyCta />
      <SajawatFooter />
      <SajawatBottomBar />
    </div>
  </>
);

export default Sajawat;
